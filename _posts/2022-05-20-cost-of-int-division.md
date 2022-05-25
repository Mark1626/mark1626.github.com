---
layout: post
title: "Deep Dive - The Cost of Integer Division"
author: Nimalan
tags: dic asm x86
excerpt_separator: <!--more-->
---

Integer division and modulo has always been expensive in the hardware. Modern CPUs convert ASM into uops internally which can then even be processed out of order, but even so division takes a lot of clock cycles to complete and stalls the pipeline. In this case study we will be compare different approaches to unsigned integer division.

<!--more-->

## Approaches

### x86 unsigned integer division

When we do not know the divisor before hand the compiler uses the `idiv` instruction. The `idiv` instruction calculates both the divisor and reminder.

For the following code GCC will generate an `idiv` instruction for both the function

```c
uint32_t mod(uint32_t n, uint32_t d) {
    return n % d;
}

uint32_t quo(uint32_t n, uint32_t d) {
    return n / d;
}
```

Between the assembly generated for division and reminder the only difference is the `movl    %edx, %eax` done to extract the reminder from the `edx` register.

```s
mod(unsigned int, unsigned int):
        movl    %edi, %eax
        xorl    %edx, %edx
        divl    %esi
        movl    %edx, %eax
        ret
quo(unsigned int, unsigned int):
        movl    %edi, %eax
        xorl    %edx, %edx
        divl    %esi
        ret

```

This instruction is very expensive, if we view the CPU execution timeline in `llvm-mca` the `div` instruction takes a very long to finish execution and also stalls the pipeline.


```
// The timeline is truncated to fit, it takes is close to 80 cycles

Timeline view:
          0         1         2  ...  7 
                    0123456789   ...  0123456789
Index     0123456789          01 ...            

[0,0]     DeER .    .    .    .  ...  .    .   .   movl	%edi, %eax
[0,1]     D--R .    .    .    .  ...  .    .   .   xorl	%edx, %edx
[0,2]     .Deeeeeeeeeeeeeeeeeee  ... eeeeeeeeeER   divl	%esi
```

### Granlund-Montgomery algorithm

The compiler uses [Granlund-Montgomery's division algorithm](https://doi.org/10.1145/773473.178249) for division when the divisor is known.

```c
/* Compiler optimizes to multiplication and shift instructions*/
uint32_t mod(uint32_t n, uint32_t d) {
    return n % 23;
}
```

Although this has a lot more instructions than the earlier version with `idiv`, the division is calculated in a single multiplication

```s
mod(unsigned int, unsigned int):
        movl    %edi, %eax
        movl    $2987803337, %edx
        imulq   %rdx, %rax
        shrq    $36, %rax
        imull   $23, %eax, %edx
        movl    %edi, %eax
        subl    %edx, %eax
        ret
```

The timeline view for a AMD Zen3 architecture CPU shows the modulo being run for 3 iterations. The amount of cycles needed is much less than using `idiv`

```

Timeline view:
                    0123456
Index     0123456789       

[0,0]     DeER .    .    ..   movl	%edi, %eax
[0,1]     DeER .    .    ..   movl	$2987803337, %edx
[0,2]     D=eeeER   .    ..   imulq	%rdx, %rax
[0,3]     D====eER  .    ..   shrq	$36, %rax
[0,4]     D=====eeeER    ..   imull	$23, %eax, %edx
[0,5]     DeE-------R    ..   movl	%edi, %eax
[0,6]     .D=======eER   ..   subl	%edx, %eax
[0,7]     .DeeeeeeeE-R   ..   retq
[1,0]     .DeE-------R   ..   movl	%edi, %eax
[1,1]     .D=eE------R   ..   movl	$2987803337, %edx
[1,2]     . D=eeeE---R   ..   imulq	%rdx, %rax
[1,3]     . D====eE--R   ..   shrq	$36, %rax
[1,4]     . D=====eeeER  ..   imull	$23, %eax, %edx
[1,5]     . DeE-------R  ..   movl	%edi, %eax
[1,6]     . D========eER ..   subl	%edx, %eax
[1,7]     .  DeeeeeeeE-R ..   retq
[2,0]     .  DeE-------R ..   movl	%edi, %eax
[2,1]     .  D=eE------R ..   movl	$2987803337, %edx
[2,2]     .  D===eeeE--R ..   imulq	%rdx, %rax
[2,3]     .   D=====eE-R ..   shrq	$36, %rax
[2,4]     .   D======eeeER.   imull	$23, %eax, %edx
[2,5]     .   DeE--------R.   movl	%edi, %eax
[2,6]     .   D=========eER   subl	%edx, %eax
[2,7]     .    DeeeeeeeE--R   retq
```

### libdivide

[libdivide](https://github.com/ridiculousfish/libdivide) replace the expensive integer divides with multiplication and bitshifts similar to the GM algorithm done by the compiler. But unlike the compiler libdivide can be used to optimize runtime constants. libdivide also allows division for SIMD vectors.

### LKK algorithm

[Lemire Kaser Kurz(LKK)](http://arxiv.org/abs/1902.01961) is another algorithm for unsigned integer division. It has similar performance to Granlund-Montgomery and is better for some divisors. This algorithm works best when we precompute the inverse of the divisor beforehand, and the divisor is to an extent a runtime constant.

A full implementation of LKK algorithm can be found in [fastmod](https://github.com/lemire/fastmod)

```c
const uint32_t d = 9;
const uint64_t c = UINT64_C(0xFFFFFFFFFFFFFFFF) / d + 1;

uint32_t fastmod(uint32_t n) {
  uint64_t lowbits = c * n;
  return ((__uint128_t)lowbits * d) >> 64;
}
```

```s
fastmod(unsigned int):
        movl    %edi, %eax
        movabsq $2049638230412172402, %rdx
        imulq   %rdx, %rax
        movl    $9, %edx
        mulq    %rdx
        movq    %rdx, %rax
        ret
```

Timeline view is similar to GM algorithm in term of the number of cycles and instruction level parallelism used.

```
Timeline view:
                    0123456
Index     0123456789       

[0,0]     DeER .    .    ..   movl	%edi, %eax
[0,1]     DeER .    .    ..   movabsq	$2049638230412172402, %rdx
[0,2]     D=eeeER   .    ..   imulq	%rdx, %rax
[0,3]     DeE---R   .    ..   movl	$9, %edx
[0,4]     D====eeeeER    ..   mulq	%rdx
[0,5]     .D=======eER   ..   movq	%rdx, %rax
[0,6]     .DeeeeeeeE-R   ..   retq
[1,0]     .DeE-------R   ..   movl	%edi, %eax
[1,1]     .D=eE------R   ..   movabsq	$2049638230412172402, %rdx
[1,2]     . D=eeeE---R   ..   imulq	%rdx, %rax
[1,3]     . DeE------R   ..   movl	$9, %edx
[1,4]     . D====eeeeER  ..   mulq	%rdx
[1,5]     . D========eER ..   movq	%rdx, %rax
[1,6]     .  DeeeeeeeE-R ..   retq
[2,0]     .  DeE-------R ..   movl	%edi, %eax
[2,1]     .  D=eE------R ..   movabsq	$2049638230412172402, %rdx
[2,2]     .  D==eeeE---R ..   imulq	%rdx, %rax
[2,3]     .   DeE------R ..   movl	$9, %edx
[2,4]     .   D=====eeeeER.   mulq	%rdx
[2,5]     .   D=========eER   movq	%rdx, %rax
[2,6]     .    DeeeeeeeE--R   retq
```


## Performance


Performance for 100 iterations

------------------------------------------------------------------------------
Method   | Instructions | Total Cycles | Total uOps | uOps Per Cycle |  IPC
---------|--------------|--------------|------------|----------------|--------
idiv     | 500          | 1462         | 3800       | 2.60           | 0.34
compiler | 800          | 234          | 1000       | 4.27           | 3.42
fastmod  | 700          | 235          | 1000       | 4.26           |  2.98
-----------------------------------------------------------------------------

## References

1. Torbjörn Granlund and Peter L. Montgomery. Division by invariant integers using multiplication. SIGPLAN Not., 29(6):61-72, jun 1994. ISSN 0362-1340. doi: 10.1145/773473.178249. URL https://doi.org/10.1145/773473.178249.

2. Daniel Lemire, Owen Kaser, and Nathan Kurz. Faster remainder by direct computation: Applications to compilers and software libraries. CoRR, abs/1902.01961, 2019. URL http://arxiv.org/abs/1902.01961.

3. Daniel Lemire [@lemire](https://github.com/lemire). fastmod. URL [https://github.com/lemire/fastmod.](https://github.com/lemire/fastmod)

4. Peter Ammon [@ridiculousfish](https://github.com/ridiculousfish). libdivide. URL [https://github.com/ridiculousfish/libdivide.](https://github.com/ridiculousfish/libdivide)

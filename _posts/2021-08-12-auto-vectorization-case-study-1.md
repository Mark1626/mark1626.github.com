---
layout: post
title: "Auto Vectorization Case Study 1"
author: Nimalan
tags: c optimization vectorization hpc
excerpt_separator: <!--more-->
---

A small case study of auto vectorization.

## The Challenge

One challenge in auto vectorization this is that the compiler has no way to know that the pointers `a`, `b` and `c` don't overlap; meaning the function can be called as `case_study_1(x, y, z)` or `case_study_1(x, x+8, x+16)`, the latter if vectorized leads to undefined behavior

```cpp
void case_study_1(int *a, int *b, int *c) {
  for (int i = 0; i < 1<<20; i++) {
    c[i] = a[i] + b[i];
  }
}
```

Example at [Godbolt](https://godbolt.org/z/b6qP8hasr)

<!--more-->

## Runtime Check of Pointers

Both clang and GCC use runtime checks of pointers to vectorize the loops as there is no guarantee that the pointers don't overlap - [Clang Runtime Check of Pointers](https://llvm.org/docs/Vectorizers.html#runtime-checks-of-pointers)

```cpp
void case_study_1(int *a, int *b, int *c) {
  for (int i = 0; i < 1<<20; i++) {
    c[i] = a[i] + b[i];
  }
}
```

They generate two sets of ASM one vectorized and another normal and call the appropriate one

```s
case_study_1(int*, int*, int*):
        lea     rcx, [rdi+4]
        mov     rax, rdx
        sub     rax, rcx              # Basic address arithmetic to look for overlap
        cmp     rax, 8                # Check for overlap
        jbe     .L5                   # Fallback to non vectorized .L5 if overlap is detected
        lea     rcx, [rsi+4]
        mov     rax, rdx
        sub     rax, rcx
        cmp     rax, 8                # Check for overlap
        jbe     .L5                   # Fallback to non vectorized .L5 if overlap is detected
        xor     eax, eax
.L3:
        movdqu  xmm0, XMMWORD PTR [rdi+rax]
        movdqu  xmm1, XMMWORD PTR [rsi+rax]
        paddd   xmm0, xmm1
        movups  XMMWORD PTR [rdx+rax], xmm0
        add     rax, 16
        cmp     rax, 4194304
        jne     .L3
        ret
.L5:
        xor     eax, eax
.L2:
        mov     ecx, DWORD PTR [rsi+rax]
        add     ecx, DWORD PTR [rdi+rax]
        mov     DWORD PTR [rdx+rax], ecx
        add     rax, 4
        cmp     rax, 4194304
        jne     .L2
        ret
```

## \_\_restrict\_\_

This can be simplified by telling the compiler that these pointers will not overlap with the `__restrict__`, this will result in the compiler generating only vector instructions

```cpp
void case_study_1(int *__restrict__ a, int *__restrict__ b, int *__restrict__ c) {
  for (int i = 0; i < 1<<20; i++) {
    c[i] = a[i] + b[i];
  }
}
```

```s
case_study_1(int*, int*, int*):
        xor     eax, eax
.L2:                                            # Vectorized loop
        movdqu  xmm0, XMMWORD PTR [rsi+rax]
        movdqu  xmm1, XMMWORD PTR [rdi+rax]
        paddd   xmm0, xmm1
        movups  XMMWORD PTR [rdx+rax], xmm0
        add     rax, 16
        cmp     rax, 4194304
        jne     .L2
        ret
```

## OpenMP

Another way to achieve vectorization here is with the OpenMP directive `#pragma omp simd`. By defining the `pragma` we force the compiler to emit vector instructions for the loop

```cpp
void case_study_1(int *a, int *b, int *c) {
  // Note: Compiler assumes there is no overlap so this has to used when you are sure there will not be a overlap
  #pragma omp simd
  for (int i = 0; i < 1<<20; i++) {
    c[i] = a[i] + b[i];
  }
}
```

```s
case_study_1(int*, int*, int*):
        xor     eax, eax
.L2:                                          # Vectorized loop
        movdqu  xmm0, XMMWORD PTR [rsi+rax]
        movdqu  xmm1, XMMWORD PTR [rdi+rax]
        paddd   xmm0, xmm1
        movups  XMMWORD PTR [rdx+rax], xmm0
        add     rax, 16
        cmp     rax, 4194304
        jne     .L2
        ret
```

---
layout: post
title: "Reverse Engineering binary executables - Part 1"
author: Nimalan
tags: dev reverse-engineering c go rust
---

This is my attempt at trying to reverse engineer and understand binaries with `hexdump`, `otool` and try to understand how things works

For this I'm going to use three `Hello World` binaries, one made from `C`, one from `GO` and one from `Rust` compiled in the `Mach Kernel` with a MacBook Pro

```c

#include <stdio.h>

int main(int argc, char** argv) {
  printf("Hello World");
  return 0;
}
```

```go

package main

import "fmt"

func main() {
	fmt.Println("Hello World")
}
```

```rs

fn main() {
  println!("Hello World!");
}
```

I'm going in blind with this, let's see what we find.

---

### Mach-O

First we have to learn about the Mach-O

[Mach-O](https://en.wikipedia.org/wiki/Mach-O) is the executable format used in Mach Kernel.

Every executable we create will be in the following layout
- Headers
- Load Commands
- Data

---

### Headers

#### Understanding the headers

```c

struct mach_header_64 {
  uint32_t  magic;    /* mach magic number identifier */
  cpu_type_t  cputype;  /* cpu specifier */
  cpu_subtype_t cpusubtype; /* machine specifier */
  uint32_t  filetype; /* type of file */
  uint32_t  ncmds;    /* number of load commands */
  uint32_t  sizeofcmds; /* the size of all the load commands */
  uint32_t  flags;    /* flags */
  uint32_t  reserved; /* reserved */
};
```

- `cf fa ed fe` is called the `magic number` indicating the file format, we read this as `0xfeedfacf`
- `ncmds` and `sizeofcmds` represents the next section in the layout
- `filetype` represents the type of Mach-O(exec, dylib). As an example running `otool` on a dylib

```c

❯ otool -h libeuler.so
Mach header
      magic cputype cpusubtype  caps    filetype ncmds sizeofcmds      flags
 0xfeedfacf 16777223          3  0x00           6    12        664 0x00100085
```

#### Checking the headers of the binaries with otool

Let's read the headers with the help of `otool`  `otool -h main`

```c

// C
Mach header
      magic cputype cpusubtype  caps    filetype ncmds sizeofcmds      flags
 0xfeedfacf 16777223          3  0x00           2    16       1368 0x00200085

// Go
Mach header
      magic cputype cpusubtype  caps    filetype ncmds sizeofcmds      flags
 0xfeedfacf 16777223          3  0x00           2    11       2512 0x00000000

// Rust
Mach header
      magic cputype cpusubtype  caps    filetype ncmds sizeofcmds      flags
 0xfeedfacf 16777223          3  0x00           2    17       2064 0x00a00085
```

#### Raw binary

> Go

```

00000000  cf fa ed fe 07 00 00 01  03 00 00 00 02 00 00 00  |................|
00000010  0b 00 00 00 d0 09 00 00  00 00 00 00 00 00 00 00  |................|
```

> C

```

00000000  cf fa ed fe 07 00 00 01  03 00 00 00 02 00 00 00  |................|
00000010  10 00 00 00 58 05 00 00  85 00 20 00 00 00 00 00  |....X..... .....|
```

> Rust

```

00000000  cf fa ed fe 07 00 00 01  03 00 00 00 02 00 00 00  |................|
00000010  11 00 00 00 10 08 00 00  85 00 a0 00 00 00 00 00  |................|
```

The hex below is part of the header  
`cf fa ed fe 07 00 00 01  03 00 00 00 02 00 00 00`  
`11 00 00 00 10 08 00 00  85`  

`cf fa ed fe` -  Magic Number  
`07 00 00 01` - CPU Type  
`03 00` - Cpusubtype  
`00 00` - caps  
`02 00` - filetype  
`11 00` - ncmd

> **Note:** I tried to read the header from the binary manually, there could be some errors in the above. If you want to understand the structure I suggest hexdump the header into the struct

---

### Load Commands

The Load Commands consists of `Sections` and `Segments`. This is quite a huge topic which I'll cover in a separate blog.

I'm skipping a lot of lines and I'll use the Load Command Section from a single binary. Let's explore some of the 
interesting sections here

- Load command 0 is `__PAGEZERO`, this is the first segment of the executable file. It is located at virtual memory 0. This provides access to `NULL`, and causes null pointers dereferences to crash
- `__TEXT` segment contains executable code and read-only data
  + Loading of the shared library is also mentioned in the `__text` section
- `__DATA` segment contains variables

```

Load command 0
      cmd LC_SEGMENT_64
  cmdsize 72
  segname __PAGEZERO
   vmaddr 0x0000000000000000
   vmsize 0x0000000100000000
  fileoff 0
 filesize 0
  maxprot 0x00000000
 initprot 0x00000000
   nsects 0
    flags 0x0
Load command 1
      cmd LC_SEGMENT_64
  cmdsize 472
  segname __TEXT
   vmaddr 0x0000000100000000
   vmsize 0x0000000000001000
  fileoff 0
 filesize 4096
  maxprot 0x00000005
 initprot 0x00000005
   nsects 5
    flags 0x0
Section
  sectname __text
   segname __TEXT
      addr 0x0000000100000f50
      size 0x0000000000000031
    offset 3920
     align 2^4 (16)
    reloff 0
    nreloc 0
     flags 0x80000400
 reserved1 0
 reserved2 0
Load command 8
          cmd LC_LOAD_DYLINKER
      cmdsize 32
         name /usr/lib/dyld (offset 12)
Load command 13
          cmd LC_LOAD_DYLIB
      cmdsize 56
         name /usr/lib/libSystem.B.dylib (offset 24)
   time stamp 2 Thu Jan  1 05:30:02 1970
      current version 1281.100.1
compatibility version 1.0.0
```

#### Shared libraries


```

> otool -L main
// C
main:
        /usr/lib/libSystem.B.dylib (compatibility version 1.0.0, current version 1281.100.1)

// Go
main:
        /usr/lib/libSystem.B.dylib (compatibility version 0.0.0, current version 0.0.0)

// Rust
main:
        /usr/lib/libSystem.B.dylib (compatibility version 1.0.0, current version 1281.100.1)
        /usr/lib/libresolv.9.dylib (compatibility version 1.0.0, current version 1.0.0)
```

> **Note:** Seems the Rust binary is also using libresolv

#### Raw data

I've showed the references `__PAGEZERO` and `__TEXT`, and the shared libraries

> Go

```

00000020  19 00 00 00 48 00 00 00  5f 5f 50 41 47 45 5a 45  |....H...__PAGEZE|
00000030  52 4f 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |RO..............|
00000040  00 00 00 01 00 00 00 00  00 00 00 00 00 00 00 00  |................|
00000050  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|
00000060  00 00 00 00 00 00 00 00  19 00 00 00 78 02 00 00  |............x...|
00000070  5f 5f 54 45 58 54 00 00  00 00 00 00 00 00 00 00  |__TEXT..........|
00000080  00 00 00 01 00 00 00 00  00 70 16 00 00 00 00 00  |.........p......|
...
00000990  00 00 00 00 00 00 00 00  0e 00 00 00 20 00 00 00  |............ ...|
000009a0  0c 00 00 00 2f 75 73 72  2f 6c 69 62 2f 64 79 6c  |..../usr/lib/dyl|
000009b0  64 00 00 00 00 00 00 00  0c 00 00 00 38 00 00 00  |d...........8...|
000009c0  18 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|
000009d0  2f 75 73 72 2f 6c 69 62  2f 6c 69 62 53 79 73 74  |/usr/lib/libSyst|
000009e0  65 6d 2e 42 2e 64 79 6c  69 62 00 00 00 00 00 00  |em.B.dylib......|
000009f0  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|
*
```

> C

```

00000020  19 00 00 00 48 00 00 00  5f 5f 50 41 47 45 5a 45  |....H...__PAGEZE|
00000030  52 4f 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |RO..............|
00000040  00 00 00 00 01 00 00 00  00 00 00 00 00 00 00 00  |................|
00000050  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|
00000060  00 00 00 00 00 00 00 00  19 00 00 00 d8 01 00 00  |................|
00000070  5f 5f 54 45 58 54 00 00  00 00 00 00 00 00 00 00  |__TEXT..........|
00000080  00 00 00 00 01 00 00 00  00 10 00 00 00 00 00 00  |................|
...
0000490  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|
000004a0  0e 00 00 00 20 00 00 00  0c 00 00 00 2f 75 73 72  |.... ......./usr|
000004b0  2f 6c 69 62 2f 64 79 6c  64 00 00 00 00 00 00 00  |/lib/dyld.......|
000004c0  1b 00 00 00 18 00 00 00  0b a2 a0 69 ef b8 32 81  |...........i..2.|
000004d0  87 55 72 32 fb 24 ba d3  32 00 00 00 20 00 00 00  |.Ur2.$..2... ...|
000004e0  01 00 00 00 00 0f 0a 00  04 0f 0a 00 01 00 00 00  |................|
000004f0  03 00 00 00 00 06 2c 02  2a 00 00 00 10 00 00 00  |......,.*.......|
00000500  00 00 00 00 00 00 00 00  28 00 00 80 18 00 00 00  |........(.......|
00000510  50 0f 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |P...............|
00000520  0c 00 00 00 38 00 00 00  18 00 00 00 02 00 00 00  |....8...........|
00000530  01 64 01 05 00 00 01 00  2f 75 73 72 2f 6c 69 62  |.d....../usr/lib|
00000540  2f 6c 69 62 53 79 73 74  65 6d 2e 42 2e 64 79 6c  |/libSystem.B.dyl|
00000550  69 62 00 00 00 00 00 00  26 00 00 00 10 00 00 00  |ib......&.......|
```

> Rust

```

00000020  19 00 00 00 48 00 00 00  5f 5f 50 41 47 45 5a 45  |....H...__PAGEZE|
00000030  52 4f 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |RO..............|
00000040  00 00 00 00 01 00 00 00  00 00 00 00 00 00 00 00  |................|
00000050  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|
00000060  00 00 00 00 00 00 00 00  19 00 00 00 c8 02 00 00  |................|
00000070  5f 5f 54 45 58 54 00 00  00 00 00 00 00 00 00 00  |__TEXT..........|
00000080  00 00 00 00 01 00 00 00  00 40 02 00 00 00 00 00  |.........@......|
...
00000710  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|
00000720  0e 00 00 00 20 00 00 00  0c 00 00 00 2f 75 73 72  |.... ......./usr|
00000730  2f 6c 69 62 2f 64 79 6c  64 00 00 00 00 00 00 00  |/lib/dyld.......|
00000740  1b 00 00 00 18 00 00 00  2f 73 d5 8d 39 42 31 ab  |......../s..9B1.|
00000750  b8 94 b4 f9 ec d5 8e 55  32 00 00 00 20 00 00 00  |.......U2... ...|
00000760  01 00 00 00 00 0f 0a 00  04 0f 0a 00 01 00 00 00  |................|
00000770  03 00 00 00 00 06 2c 02  2a 00 00 00 10 00 00 00  |......,.*.......|
00000780  00 00 00 00 00 00 00 00  28 00 00 80 18 00 00 00  |........(.......|
00000790  60 11 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |`...............|
000007a0  0c 00 00 00 38 00 00 00  18 00 00 00 02 00 00 00  |....8...........|
000007b0  01 64 01 05 00 00 01 00  2f 75 73 72 2f 6c 69 62  |.d....../usr/lib|
000007c0  2f 6c 69 62 53 79 73 74  65 6d 2e 42 2e 64 79 6c  |/libSystem.B.dyl|
000007d0  69 62 00 00 00 00 00 00  0c 00 00 00 38 00 00 00  |ib..........8...|
000007e0  18 00 00 00 02 00 00 00  00 00 01 00 00 00 01 00  |................|
000007f0  2f 75 73 72 2f 6c 69 62  2f 6c 69 62 72 65 73 6f  |/usr/lib/libreso|
00000800  6c 76 2e 39 2e 64 79 6c  69 62 00 00 00 00 00 00  |lv.9.dylib......|
00000810  26 00 00 00 10 00 00 00  f0 9f 02 00 28 02 00 00  |&...........(...|
00000820  29 00 00 00 10 00 00 00  18 a2 02 00 d8 00 00 00  |)...............|
00000830  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|
*
```


---

### Data

The content of this section varies depending on how or what creates or binary.
I'll go over each binary separately in detail later, but for now some highlights

#### C

This one is straight forward, found the `Hello World` string within the binary

```

00000fa0  ff ff 48 65 6c 6c 6f 20  57 6f 72 6c 64 00 00 00  |..Hello World...|
```

Found a reference to the `main` and the `printf`

```

00003000  11 23 00 51 00 00 00 00  11 40 64 79 6c 64 5f 73  |.#.Q.....@dyld_s|
00003010  74 75 62 5f 62 69 6e 64  65 72 00 51 72 00 90 00  |tub_binder.Qr...|
00003020  73 00 11 40 5f 70 72 69  6e 74 66 00 90 00 00 00  |s..@_printf.....|
00003030  00 01 5f 00 05 00 02 5f  6d 68 5f 65 78 65 63 75  |.._...._mh_execu|
00003040  74 65 5f 68 65 61 64 65  72 00 21 6d 61 69 6e 00  |te_header.!main.|
00003050  25 02 00 00 00 03 00 d0  1e 00 00 00 00 00 00 00  |%...............|
```

#### Go

Go has a build ID in the binary

```

00001000  ff 20 47 6f 20 62 75 69  6c 64 20 49 44 3a 20 22  |. Go build ID: "|
00001010  67 68 73 2d 76 57 69 35  5f 34 6f 39 54 6a 4f 4e  |ghs-vWi5_4o9TjON|
00001020  77 30 62 66 2f 79 43 36  61 51 6a 67 62 31 35 6e  |w0bf/yC6aQjgb15n|
00001030  57 51 45 70 6d 43 59 79  48 2f 6e 45 77 6f 67 77  |WQEpmCYyH/nEwogw|
00001040  6b 55 6b 4b 39 63 42 72  6e 6e 6d 55 4e 4b 2f 4c  |kUkK9cBrnnmUNK/L|
00001050  4f 59 34 75 38 4a 52 53  6c 4b 54 47 50 4e 6e 78  |OY4u8JRSlKTGPNnx|
00001060  67 70 6b 22 0a 20 ff cc  cc cc cc cc cc cc cc cc  |gpk". ..........|
```

The binary seems to have some references to which file was used to create it, and the dependencies
(in this case fmt).

```

...
00163670  68 65 6c 6c 6f 2d 77 6f  72 6c 64 2d 67 6f 2f 6d  |hello-world-go/m|
00163680  61 69 6e 2e 67 6f 00 2f  55 73 65 72 73 2f 6e 69  |ain.go./Users/ni|
...
001636a0  74 61 6c 6c 73 2f 67 6f  6c 61 6e 67 2f 31 2e 31  |talls/golang/1.1|
001636b0  34 2e 36 2f 67 6f 2f 73  72 63 2f 66 6d 74 2f 73  |4.6/go/src/fmt/s|
001636c0  63 61 6e 2e 67 6f 00 2f  55 73 65 72 73 2f 6e 69  |can.go./Users/ni|
```

And the `Hello World` string, interestingly there doesn't seem to be any bytes separating the near-by strings

```

000cd870  54 52 41 43 45 42 41 43  4b 48 65 6c 6c 6f 20 57  |TRACEBACKHello W|
000cd880  6f 72 6c 64 49 64 65 6f  67 72 61 70 68 69 63 4d  |orldIdeographicM|
```

#### Rust

I expect this should be straight forward like the see binary, and yes I found the `Hello World!`

```

00020a60  48 65 6c 6c 6f 20 57 6f  72 6c 64 21 0a 00 00 00  |Hello World!....|
```

This area of the Virtual memory also seems to be the place other strings are present, so I found a couple of error message strings

```

00020aa0  61 6c 72 65 61 64 79 20  62 6f 72 72 6f 77 65 64  |already borrowed|
00020ab0  63 6f 6e 6e 65 63 74 69  6f 6e 20 72 65 73 65 74  |connection reset|
00020ac0  65 6e 74 69 74 79 20 6e  6f 74 20 66 6f 75 6e 64  |entity not found|
```

### Summary

For the first run with binary we've found some really good stuff. Still there are a lot of things to explore in the `Load Command` and `Data` sections

### Further Reading

- [macho-file-format](https://h3adsh0tzz.com/2020/01/macho-file-format/)
- [Mach-O](https://en.wikipedia.org/wiki/Mach-O)
- [Mach-O Format Reference](https://github.com/dylib/osx-abi-macho-file-format-reference)

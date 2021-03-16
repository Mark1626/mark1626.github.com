---
layout: post
title: "The Drunken Bishop"
author: Nimalan
tags: dev ssh algorithm
excerpt_separator: <!--more-->
---

Have you ever seen something similar to this??

```
+----[RSA 2048]---+
|        . o.+o  .|
|     . + *  +o...|
|      + * .. ... |
|       o + .   . |
|        S o   .  |
|         o     . |
|          .     o|
|               .o|
|               Eo|
+------[MD5]------+
```

Usually when we create a new SSH key there is an image printed at the last step and we mostly ignore it, this time I wanted to understand what this image meant. 

The image is a visualization of the fingerprint created with the Drunken Bishop Algorithm

<!--more-->

### What is this image?

The Drunken Bishop Algorithm is an algorithm used by OpenSSH for visualizing the fingerprints of SSH keys.

### Why do we need a Fingerprint Visualization Algorithm?

```
❯ ssh user@my.host
Do you want to connect to authentic host with fingeprint fc94b0c1e5b0987c5533997697ee9fb7
+-----------------+
|        . o.+o  .|
|     . + *  +o...|
|      + * .. ... |
|       o + .   . |
|        S o   .  |
|         o     . |
|          .     o|
|               .o|
|               Eo|
+-----------------+

❯ ssh user@my.__host
Do you want to connect to malicious host with fingeprint fc94b0c1e5b0987c5843997697ee9fb7
+-----------------+
|       .=o.  .   |
|     . *+*. o    |
|      =.*..o     |
|       o + ..    |
|        S o.     |
|         o  .    |
|          .  . . |
|              o .|
|               E.|
+-----------------+

```

In the above example it would be nearly impossible to find out that the host is different just by looking at the hashes `fc94b0c1e5b0987c5533997697ee9fb7` and `fc94b0c1e5b0987c5843997697ee9fb7`. The visual aid can make a big difference in this scenario

### How does it work?

Consider a bishop in the center of a `17x9` board

```
0   1   2   3   4   5   6 ... 14  15  16
17  18  19  20  21 .......    31  32  33
...
...               76
...
...
136 137 ....                  150 151 152
```

Each bit of the fingerprint represents the path traversed by the bishop.

```
Fingerprint        fc         :     94      : ... : b7
Bits        11   11   11   00 : 10 01 01 00 : ... : 10  11  01  11
            |    |    |    |    |  |  |  |          |   |   |   |
Step        4    3    2    1    8  7  6  5    ...   64  63  62  61
```

For each bit we move in the following direction

```
00 - Upper left
01 - Upper right
10 - Lower right
11 - Lower left
```

When the bishop tries to move outside the grid it stays in the same square it started from

When the bishop visits a grid we increment a count on how many times it has visited that grid

To visualize the grid we use the following characters. `S` and `E` are special characters we use to mark the start and end of the bishop's journey

| Value     | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|-----------|---|---|---|---|---|---|---|---|---|---|----|----|----|----|----|----|----|
| Character |   | . | o | + | = | * | B | O | X | @ | %  | &  | #  | /  | ^  | S  | E  |

### Is is this good to rely on visualization?

The next question we may have is that, can there be two hashes with similar visuals. The answer is yes, but finding one would be similar to finding a hash collision

These visualization are surprisingly resistant to collision

### How to Enable this in SSH Config

You can make it be printed when doing SSH related operations by setting
```
// ~/.ssh/config
VisualHostKey true
```

### References and Further links

- [White Paper](http://www.dirk-loss.de/sshvis/drunken_bishop.pdf)
- [Implementation in Node](https://github.com/Mark1626/Paraphernalia/blob/master/drunken-bishop/main.js)

Retro video games used similar approach of relying on visuals for checkpoints. An example of how this was used in Castlevania 3

- [Castlevania 3 Password Algorithm](https://meatfighter.com/castlevania3-password/)

---
layout: post
title: "Reverse Engineering Code Art - Part 9"
author: Nimalan
tags: dev reverse-engineering
excerpt_separator: <!--more-->
---

This [dwitter](https://www.dwitter.net/d/4388) is by [r]()

This looks rather simple but the effects are astonishing.

```js
for(i=w=3e3,a=b=g=333*T(t%9/7);j=(i^a*a)%4,i--;x.fillRect(a+=g+C(j*5+t)*g-a/2-w+g,b+=g+S(j*9+t)*g-b/2-w,s,s),w=2)x.fillStyle=R(s=w*9,w,s,.1)
```

<!--more-->

### Step 1: Format

```js
for (
  i = w = 3e3, a = b = g = 333 * T((t % 9) / 7);
  (j = (i ^ (a * a)) % 4), i--;
  x.fillRect(
    (a += g + C(j * 5 + t) * g - a / 2 - w + g),
    (b += g + S(j * 9 + t) * g - b / 2 - w),
    s,
    s
  ),
    w = 2
)
  x.fillStyle = R((s = w * 9), w, s, 0.1);
```

## Steps 2: Restructure and Analysis

```js
let w = 3e3; // This is set to 3e3 to clear the screen

let a = 333 * T((t % 9) / 7);
let b = 333 * T((t % 9) / 7);
let g = 333 * T((t % 9) / 7);
let s = w * 9;

for (let i = 3e3; i; i--) {
  j = (i ^ (a * a)) % 4;
  // x.fillRect(a, b, s, s);
  a += g + C(j * 5 + t) * g - a / 2 - w + g;
  b += g + S(j * 9 + t) * g - b / 2 - w;
  s = w * 9;
  x.fillStyle = R(s, w, s, 0.1);
  x.fillRect(a, b, s, s);
  w = 2;
}
```

`w = 3e3;` is set to 3e3 to clear the screen in the initial fillRect. the size of each box is a fixed `2 px` after that.

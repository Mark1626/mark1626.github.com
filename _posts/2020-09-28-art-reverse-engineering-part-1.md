---
layout: post
title: "Reverse Engineering Code Art"
author: Nimalan
tags: dev reverse-engineering
---

URL - https://www.dwitter.net/d/3078  
Author - https://www.dwitter.net/u/FireFly

Incredibly amazing piece of code

```js
for(i=2e3;!t&&i--;Math.random()>(X**2+(Y-4)**2)**.5/6&&f(7)+f(-7))X=i&3,Y=i>>2&7,f=m=>x.fillRect(240*(i>>5&7)+120-X*m,180*(i>>8)+50+Y*7,7,7)
```

---

Let's start by formatting the code

```js
for (
  i = 2e3;
  !t && i--;
  Math.random() > (X ** 2 + (Y - 4) ** 2) ** 0.5 / 6 && f(7) + f(-7)
)
  (X = i & 3),
    (Y = (i >> 2) & 7),
    (f = (m) =>
      x.fillRect(
        240 * ((i >> 5) & 7) + 120 - X * m,
        180 * (i >> 8) + 50 + Y * 7,
        7,
        7
      ));
```

---

Hmm, no luck trying to figure out directly, after spending sometime brought it to this

**Notes:**
- Based on `Math.random() > (X ** 2 + (Y - 4) ** 2) ** 0.5 / 6` fill pixel
- Fill both sizes for symmetry
- X and Y are the last 5 bits of i
- X -> [0, 3], Y -> [0, 7]
- `i` is split as `yyyxxxYYYXX`
- `(240 * Xpx)` and `(180 * Ypx)` are used to repeat the pattern as tiles


```js
const Sprite = () => {
  for (i = 2e3; i--; ) {
    // 11111010000 - 2000
    // yyyxxxYYYXX
    // X and Y are the last 5 bits of i
    const X = i & 3; // Last 2 bits, so X is 0, 1, 2, 3
    const Y = (i >> 2) & 7;
    const Xpx = (i >> 5) & 7;
    const Ypx = i >> 8;
    
    const fill = (m) => {
      x.fillRect((240 * Xpx) + 120 - (X * m), (180 * Ypx) + 50 + (Y * 7), 7, 7);
    };

    if (Math.random() > (X ** 2 + (Y - 4) ** 2) ** 0.5 / 6) {
      // Fill both sides for symmetry
      fill(7);
      fill(-7);
    }
  }
};
```

---

Let's tear it down a bit more to a single sprite

`woff` - horizontal offset  
`hoff` - vertical offset

The condition `(X ** 2 + (Y - 4) ** 2) ** 0.5 / 6)` is an equation of a circle, we are checking if `X` and `Y` lie inside the circle, who's radius is `Math.random() * 6`.

The main params that generate the sprite is the equation of the circle
and the pair `(woff - X, hoff + Y)`.

Each pair represents a quadrant of the circle

There are 4 diff pairs

- `(woff + X, hoff + Y)` Quad 1
- `(woff - X, hoff + Y)` Quad 2
- `(woff - X, hoff - Y)` Quad 3
- `(woff + X, hoff - Y)` Quad 4

We use the first two quadrants, for the sprite

Why does `X -> [0, 3]`, `Y -> [0, 7]`?

We specifically use `(Y - 4)` as we are using the first two quadrants. It's `X -> [0, 3]`, `Y -> [0, 3]` for first quadrant and `X -> [0, 3]`, `Y -> [-3, 0]` for the second quadrant.

```js
const Sprite = (woff, hoff) => {
  for (i = 31; i--; ) {
    const X = i & 3;
    const Y = (i >> 2) & 7;

    const fill = (m) => {
      x.fillRect(woff - (X * m), hoff + (Y * 7), 7, 7);
    };

    if (Math.random() > (X ** 2 + (Y - 4) ** 2) ** 0.5 / 6) {
      // Fill both sides for symmetry
      fill(7);
      fill(-7);
    }
  }
};
```

---
layout: post
title: "Reverse Engineering Code Art - Part 4 - City Sunset"
author: Nimalan
tags: dev reverse-engineering
---

[City Sunset v2](https://www.dwitter.net/d/17507) by [KilledByAPixel](https://www.dwitter.net/u/KilledByAPixel)

You can read [his blog](https://frankforce.com/dissecting-a-dweet-9-city-sunset/) on this dwitter on his site. I wanted to reverse engineer it myself before reading his blog, so here goes.

The code is quite simple compared to the previous ones I've posted, which is why why I really like this dwitter so much

```js


for(z=k=2e3;k--;x.fillRect(i*9+S(z*t)*z|0,j*9+t*420,t?9:z,9))i=k%9,j=k/9|0,x.fillStyle=R(q=t?i*j%2*400*S(k*k*t):k/3+C(k*k)*39,q-99,t?q-k:99)


```

![City Sunset](/assets/images/city_sunset.png)

---

### Step 1: Format

```js
for (
  z = k = 2e3;
  k--;
  x.fillRect((i * 9 + S(z * t) * z) | 0, j * 9 + t * 420, t ? 9 : z, 9)
)
  (i = k % 9),
    (j = (k / 9) | 0),
    (x.fillStyle = R(
      (q = t ? ((i * j) % 2) * 400 * S(k * k * t) : k / 3 + C(k * k) * 39),
      q - 99,
      t ? q - k : 99
    ));
```

---

### Step 2: Rearrange it

```js
const z = 2e3;
let q;
for (let k = 2e3; k--; ) {
  const i = k % 9; // x-axis
  const j = (k / 9) | 0; // y-axis
  if (t) {
    if ((i * j) % 2) {
      q = 400 * S(k * k * t); // Lights in the building
    } else {
      q = 0; // Building or rather the black space surrounding the lights
    }
  } else {
    q = k / 3 + C(k * k) * 39; // Sunset effect
  }

 // Offsets building into the back, at later t
  const rx = (i * 9 + S(z * t) * z) | 0;
  const ry = j * 9 + t * 420;

  const w = t ? 9 : z;
  const h = 9;

  x.fillRect(rx, ry, w, h);
  x.fillStyle = R(q, q - 99, t ? q - k : 99);
}
```

#### Summary:

- `a | 0 ` is an easy way of removing the digits after the decimal `123.12 | 0` will give `123`
- As you can see from the conditional, at `t = 0` the sunset effect is rendered, `rx` and `ry` are `i * 9` and `j * 9`
respectively

![Sunset at t0](/assets/images/sunset_t0.png)

- After `t=0` the building starts to be rendered, A building is a simple 9*9 grid of squares, each window is at a even square in the grid

```js
if ((i * j) % 2) {
  q = 400 * S(k * k * t); // Lights in the building
} else {
  q = 0; // Building or rather the black space surrounding the lights
}
```

- There is one other effect in this, which is the building height decreasing, this is achieved by the

```js
const rx = (i * 9 + S(z * t) * z) | 0;
const ry = j * 9 + t * 420;
```

building rendered at a later `t` are rendered lower in the y-axis

This pretty much sums everything about this dwitter, and as I mentioned there is not many complexity in this one, but the effect it produces is quite stunning.

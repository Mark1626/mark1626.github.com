---
layout: post
title: "Reverse Engineering Code Art - Part 3"
author: Nimalan
tags: dev reverse-engineering
---

[Original Dwitter](https://www.dwitter.net/d/7423) by [Author](https://www.dwitter.net/u/jylikangas)

![Screenshot Complete](/assets/images/screenshot_tower.png)

```js


for(c.width=i=608;i--;)i%320<64&&i&2||i>447&i%32<6|i>576&i%2||x.fillRect(304+S(A=i/5.1+t)*(80+19*(i<256))+i%5,99+(i>>5)*12+(s=C(A)*8),8+s,9)


```

---

Let's start with a simple format

```js
for (c.width = i = 608; i--; )
    (i % 320 < 64 && i & 2) ||
      ((i > 447) & (i % 32 < 6)) | ((i > 576) & i % 2) ||
      x.fillRect(
        304 + S((A = i / 5.1 + t)) * (80 + 19 * (i < 256)) + (i % 5),
        99 + (i >> 5) * 12 + (s = C(A) * 8),
        8 + s,
        9
      );
```

---

Now let's rearrange it a bit

Hmm, not much improvement in understanding the code yet

Notes:
- `c.width = 608` is to clear the canvas at the start of the animation
- The effect of rotation is handled by `Math.sin(a)` where `A = i / 5.1 + t`
- `(i >> 5)` is used in y coordinate and `(i < 256)` is used as a boolean in x coordinate

```js
c.width = 608;
for (i = 608; i--; ) {
  if (!(i % 320 < 64 && i & 2)) {
    if (!(((i > 447) & (i % 32 < 6)) | ((i > 576) & i % 2))) {
      const A = i / 5.1 + t;
      const s = C(A) * 8;
      x.fillRect(
        304 + S(A) * (80 + 19 * (i < 256)) + (i % 5),
        99 + (i >> 5) * 12 + s,
        8 + s,
        9
      );
    }
  }
}
```

---

Let's break this down

```js
const u = (t) => {
  c.width = 608
  for (i = 608; i--; ) {
    const A = i / 5.1 + t;
    const s = C(A) * 8;
    x.fillRect(
      304 + S(A) * 80,
      99,
      8 + s,
      9
    );
  }
};
```

Would produce a single strip

![Screenshot 1](/assets/images/screenshot_tower_1.png)

---

Adding the varying `s` we get a band

```js
const u = (t) => {
  c.width = 608
  for (i = 608; i--; ) {
    const A = i / 5.1 + t;
    const s = C(A) * 8;
    x.fillRect(
      304 + S(A) * 80,
      99 + s,
      8 + s,
      9
    );
  }
};
```

![Screenshot 2](/assets/images/screenshot_tower_2.png)

---

We add `(i >> 5) * 12` so we can get multiple bands, and make it a cylinder

```js
const u = (t) => {
  c.width = 608
  for (i = 608; i--; ) {
    const A = i / 5.1 + t;
    const s = C(A) * 8;
    x.fillRect(
      304 + S(A) * 80,
      99 + (i >> 5) * 12 + s,
      8 + s,
      9
    );
  }
};
```

![Screenshot 3](/assets/images/screenshot_tower_3.png)

---

Adding `(i % 5)` make some segments in the band elevated, giving the bricks effect

```js
const u = (t) => {
  c.width = 608
  for (i = 608; i--; ) {
    const A = i / 5.1 + t;
    const s = C(A) * 8;
    x.fillRect(
      304 + S(A) * 80 + (i % 5),
      99 + (i >> 5) * 12 + s,
      8 + s,
      9
    );
  }
};
```

![Screenshot 4](/assets/images/screenshot_tower_4.png)

---

To make the top of the tower larger than the base we increase the `x pos` by adding `19 * (i < 256)`

```js
const u = (t) => {
  c.width = 608
  for (i = 608; i--; ) {
    const A = i / 5.1 + t;
    const s = C(A) * 8;
    x.fillRect(
      304 + S(A) * (80 + 19 * (i < 256)) + (i % 5),
      99 + (i >> 5) * 12 + s,
      8 + s,
      9
    );
  }
};
```

![Screenshot 5](/assets/images/screenshot_tower_5.png)

---

Beyond this it's not very straightforward but let's break it even more

- The expression `((i > 447) & (i % 32 < 6))` is to add the entrance at the bottom of the tower
![Screenshot 7](/assets/images/screenshot_tower_7.png)
- `((i > 576) & i % 2)` is to add the brick effect at the base layer of the tower
![Screenshot 6](/assets/images/screenshot_tower_6.png)
- `((i > 447) & (i % 32 < 6)) | ((i > 576) & i % 2)` is to combine both the equations

```js
const u = (t) => {
  c.width = 608
  for (i = 608; i--; ) {
    const A = i / 5.1 + t;
    const s = C(A) * 8;
    (((i > 447) & (i % 32 < 6)) | ((i > 576) & i % 2)) || 
    x.fillRect(
      304 + S(A) * (80 + 19 * (i < 256)) + (i % 5),
      99 + (i >> 5) * 12 + s,
      8 + s,
      9
    );
  }
};
```

![Screenshot 8](/assets/images/screenshot_tower_8.png)

---

Now for the last condition

- `i % 320 < 64` cause a section in the tower to not be filled
![Screenshot 9](/assets/images/screenshot_tower_9.png)
- Along with `i & 2` the equation `(i % 320 < 64 && i & 2)` will create the windows in middle and the iconic tower shape in the top
![Screenshot 10](/assets/images/screenshot_tower_10.png)
- To test the last statement I extended the height of the tower to `960`
![Screenshot 11](/assets/images/screenshot_tower_11.png)

```js
const u = (t) => {
  c.width = 608
  for (i = 608; i--; ) {
    const A = i / 5.1 + t;
    const s = C(A) * 8;
    (i % 320 < 64 && i & 2) || 
    x.fillRect(
      304 + S(A) * (80 + 19 * (i < 256)) + (i % 5),
      99 + (i >> 5) * 12 + s,
      8 + s,
      9
    );
  }
};
```

---

Putting all the equations together we get the tower

### Summary

- `c.width = 608` is to clear the canvas at the start of the animation
- The effect of rotation is handled by
  + `X = 304 + Math.sin(A)` where `A = i / 5.1 + t`
  + `Y = 99 + s`
  + size of brick is `s = Math.cos(A) * 8`
- We now have a single band, to repeat the bands `(i >> 5) * 12`
- To make some segments elevated and get the brick effect we use `(i % 5)`
- To make the top of the tower larger than the base we increase the `x pos` by adding `19 * (i < 256)`
- The expression `((i > 447) & (i % 32 < 6))` is to add the entrance at the bottom of the tower
- `((i > 576) & i % 2)` is to add the brick effect at the base layer of the tower
- `i % 320 < 64` cause a section in the tower to not be filled
- `(i % 320 < 64 && i & 2)` will create the window effect

Whew, this probably took quite effort to create, incredibly satisfying experience for me to figure it out

![Screenshot Complete](/assets/images/screenshot_tower.png)

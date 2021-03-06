---
layout: post
title: "My first dwitter"
author: Nimalan
tags: dev code-art
excerpt_separator: <!--more-->
---

Finally my first [dwitter](https://www.dwitter.net/d/21831)

Remix of this [dwitter](https://www.dwitter.net/d/5643) by [sandromiccoli](https://www.dwitter.net/u/sandromiccoli)

```js

for(i=0;i<88*(t%9);i++){p=t/10+i,s=(t%4.735)*100,x.fillStyle=R(0,p%255,s%255,t%0.04),x.fillRect(635+C(p)*S(t)*s,540+S(p)*C(t)*s,5,5)}

```

![First Dwitter](/assets/images/first-dwitter-eye.png)

<!--more-->

---

## The origin of the idea

This is the original dwitter it is based on

```js

for(i=0;i<44*(t%9);i++){x.fillStyle=R(0,0,0,0.045);s=t%4.735*100;x.fillRect(960+S(t/10+i)*(C(t)*s),540+C(t/10+i)*s,5,5)
}

```

Formatting it

```js

for (i = 0; i < 88 * (t % 9); i++) {
  const s = (t % 4.735) * 100;
  const p = t / 10 + i;
  const X = 635 + C(p) * C(t) * s;
  const Y = 540 + S(p) * s;
  x.fillStyle = R(0, 0, 0, Math.random() / 25);
  x.fillRect(X, Y, 5, 5);
}

```

See that the X and Y are based on equations similar to the equation of a circle

```
 X = a + r*cos(theta)
 Y = a + r*sin(theta)
```

The effect is created by the `cos(t / 10 + 1)`

---

## My remix

The formatted code looks like this

```js

for (i = 0; i < 88 * (t % 9); i++) {
    const p = t / 10 + i;
    const s = (t % 4.735) * 100;
    const X = 635 + C(p) * S(t) * s;
    const Y = 540 + S(p) * C(t) * s;
    x.fillStyle = R(0, p % 255, s % 255, t % 0.04)
    x.fillRect(X, Y, 5, 5);
  }

```

To bring about a symmetry in the cycle, I first changed the equation

```js

const X = 635 + cos(p) * sin(t) * s;
const Y = 540 + sin(p) * cos(t) * s;

```

Next I reused the variable `p` for the color, but this resulted it the number of characters being more than 140.
To reduce this I found that the `Math.random()` could be a potential source where this can be reduced, so rather than relying on `Math.random` I used `t % 0.04`, the reason for the ` % 0.04` is to keep the opacity below `0.04` to have a transparent effect

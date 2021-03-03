---
layout: post
title: "Reverse Engineering Code Art - Part 5"
author: Nimalan
tags: dev reverse-engineering
excerpt_separator: <!--more-->
---

This [dwitter](https://www.dwitter.net/d/21570) by [cantelope](https://www.dwitter.net/u/cantelope)

I absolutely love this one visually. It is based on the tessellation [Rhombille tiling](https://en.wikipedia.org/wiki/Rhombille_tiling) with [stellations](https://en.wikipedia.org/wiki/Stellation) The math behind it is awesome and I had to revisit it to write this.

```js


eval(unescape(escape`𤐽𬐽🡸𛡬𪑮𩑔𫰨𞀸𚱘𛱱𚠵𜀬𝐰𚱙𛱱𚠵𜀩𒡦𫱲𚁦🐱𝰬𪐽𨰮𭱩𩁴𪀽𜐷𝐬𫠽𤰨𭀩𞱩𛐭𞱸𛡳𭁲𫱫𩐨𚐩𩡯𬠨𮀮𨡥𩱩𫡐𨑴𪀨𪠽𝠩𞱪𛐭𞱑𚀲𛑮𚐩𦀽𚁩𛑴𙐱𚐥𩠪𛠹𚰨𨠽𪐯𩡼𜀩𙐲𚠮𝀴𛐸𛁙🐨𨠫𫠥𜠥𩠭𝀩𚠳𛰴𛁑𚀲𚐬𦀫👓𚁰👪𛰮𞐵𚐯𜠬𦐫👃𚁰𚐯𜠻`.replace(/u../g,'')))


```

![Code Art 5-2](/assets/images/code_art_5_1.png)

![Code Art 5-1](/assets/images/code_art_5_2.png)

<!--more-->

### Step 0: Extract from Unicode

The Unicode string is to reduce the number of characters used, each Unicode character contains 2 characters. `🐱` for example is `=1` decoded. The entire dwitter decoded

```js

Q=q=>x.lineTo(88+X/q*50,50+Y/q*50)
for(f=17,i=c.width=175,n=S(t);i--;x.stroke())for(x.beginPath(j=6);j--;Q(2-n))X=(i-t%1)%f*.9+(b=i/f|0)%2*.44-8,Y=(b+n%2%f-4)*3/4,Q(2),X+=S(p=j/.95)/2,Y+=C(p)/2;


```

### Step 1: Format

```js

c.width = 175   // This is used to set the width and clear the screen

let X, Y
const Q = (q) => x.lineTo(88 + (X / q) * 50, 50 + (Y / q) * 50);
const f = 17
const n = S(t)
const draw = (i, j) => {
  const p = j / 0.95;
  const b = (i / f) | 0

  X = ((i - (t % 1)) % f) * 0.9 + (b % 2) * 0.44 - 8;
  Y = ((b + ((n % 2) % f) - 4) * 3) / 4;
  Q(2)

  X += S(p) / 2
  Y += C(p) / 2;
  Q(2 - n)
}

for (let i = 175; i--; ) {
  x.beginPath()
  for (j = 6; j--; ) {
    draw(i, j)
  }
  x.stroke()
}

```

Well now the entire code looks like a normal canvas example. The entire thing is optimized for a width of 175, I can't seem to scale it properly.
Now to investigate the draw function and the Q function.

### Step 2: Remove the elements which add time

![Code Art 5-3](/assets/images/code_art_5_3.png)

```js

const Q = (q) => x.lineTo(88 + (X / q) * 50, 50 + (Y / q) * 50);
const f = 17
const draw = (i, j) => {
  const p = j / 0.95;
  const b = (i / f) | 0

  X = (i % f) * 0.9 + (b % 2) * 0.44 - 8;
  Y = ((b - 4) * 3) / 4;
  Q(2)

  X += S(p) / 2
  Y += C(p) / 2;
  Q(2)
}

```

Now to understand how the Rhombille tiling is done

The values `X = (i % f) * 0.9 + (b % 2) * 0.44 - 8;` and `Y = ((b - 4) * 3) / 4;` represent the center of the point from which do draw. These two are constant

There is a neat little trick here to get 2 PI

```js
// 6 / 0.95 = 2 * Math.PI
p = 6
const p = j / 0.95;
```

The iteration from p = 6 to 1 is to draw at every 60deg angles

Running `draw(160)` over `p` a single star can be created.

![Code Art 5-5](/assets/images/code_art_5_5.png)

When two stars intersect, a rhombi is created with two 60 deg and 120 deg angles

![Code Art 5-6](/assets/images/code_art_5_6.png)

Repeating the process will create the Rhombille tiling tessellation

### Step 3: Understanding the usage of time

Now let's go back to the version of the code with time

```js
const Q = (q) => x.lineTo(88 + (X / q) * 50, 50 + (Y / q) * 50);
const f = 17
const n = S(t)
const draw = (i, j) => {
  const p = j / 0.95;
  const b = (i / f) | 0

  X = ((i - (t % 1)) % f) * 0.9 + (b % 2) * 0.44 - 8;
  Y = ((b + ((n % 2) % f) - 4) * 3) / 4;
  Q(2)

  X += S(p) / 2
  Y += C(p) / 2;
  Q(2 - n) // Stellation
}
```

Adding `Q(2 - sin(t))` adds the stellation effect. The other usage of time here is to give the moving effect, also to note in the moving effect the point have to be brought back to their original location

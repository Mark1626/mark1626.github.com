---
layout: post
title: "Reverse Engineering Code Art - Part 2"
author: Nimalan
tags: dev reverse-engineering
---
Analysing `The eye of the storm`

[Original Dwitter](https://www.dwitter.net/d/20096) by [cantelope](https://www.dwitter.net/u/cantelope)

[TLDR](#summary)

![Screenshot](/assets/images/screenshot_eye.png)

```js


eval(unescape(escape`𩡯𬠨𪐽𪀽𝐴𜀬𣰽𬐽🠨𣑡𭁨𛡲𨑮𩁯𫐨𚐪𜠭𜐩𚡷𞱩𛐭𞱸𛡣𫁥𨑲𤡥𨱴𚁨𚱩𙐲𚠴𝐬𜠵𝠫𚁩𙐴𛰲𯀰𚐪𞐰𛀳𝐬𞀰𚐩𮀮𩡩𫁬𤡥𨱴𚁘🐨𭰽𞐶𜀩𚱏𚀩𛁙👨𚱏𚀩𛁳👷𛰨𭀥𞀩𛰹𛁳𛁸𛡦𪑬𫁓𭁹𫁥👠𪁳𫀨𜐵𜀠𞐹𙐤𮰨𣑡𭁨𛡨𮑰𫱴𚁘𛑷𛁙𛑨𚐯𜐸𜀩𚠪𜱽𙑠𚐻`.replace(/u../g,'')))


```

---

The whole code is in unicode, this is to reduce the size of the whole code.
Let's evaluate the unicode to utf-8

```js


for(i=h=540,O=q=>(Math.random()*2-1)*w;i--;x.clearRect(h+i%2*45,256+(i%4/2|0)*90,35,80))x.fillRect(X=(w=960)+O(),Y=h+O(),s=w/(t%8)/9,s,x.fillStyle=`hsl(150 99%${(Math.hypot(X-w,Y-h)/180)**3}%`);


```

---

Much better, now let's start analysing it

```js
for (
  i = h = 540, O = (q) => (Math.random() * 2 - 1) * w;
  i--;
  x.clearRect(h + (i % 2) * 45, 256 + (((i % 4) / 2) | 0) * 90, 35, 80)
)
  x.fillRect(
    (X = (w = 960) + O()),
    (Y = h + O()),
    (s = w / (t % 8) / 9),
    s,
    (x.fillStyle = `hsl(150 99%${(Math.hypot(X - w, Y - h) / 180) ** 3}%`)
  )
```

---

Rearranging things to make it look readable.  

There are some JS tricks I ran into used to obsure the code

- `(w = 960) + O()` is simply `960 + O()` with w initialized
- In the function `O=q=>(Math.random()*2-1)*w;` even though the param `q` is not used, we have a param as `q` is 1 char compared to `()` 2 chars
- `Math.hypot(X, Y)` to save space instead of `(X**2 + Y**2)**0.5`

```js
const w = 960;
const h = 540;
const O = () => (Math.random() * 2 - 1) * w;

for (let i = h; i--; ) {
  const X = w + O();
  const Y = h + O();
  const s = w / (t % 8) / 9;

  x.fillStyle = `hsl(150 99%${(Math.hypot(X - w, Y - h) / 180) ** 3}%`;
  x.fillRect(X, Y, s, s);
  x.clearRect(h + (i % 2) * 45, 256 + (((i % 4) / 2) | 0) * 90, 35, 80); // Lens flare
}
```

Now for the math

### Summary

- w is the width of the eye of the storm
- `O = () => (Math.random() * 2 - 1) * w;` gives value from [-w, w]
- Using the `O()` a random `X` and `Y` is calculated
- `x.clearRect` is used to give the lens flare effect
- `Math.hypot(X - w, Y - h) / 180) ** 3` is used to calculate the lightness in `hsl`(distance from center)
- `s` is the size of the pixel, `t % 8` so the size varies with time to give the blur effect
- 

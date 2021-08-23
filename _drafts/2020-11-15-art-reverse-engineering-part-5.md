---
layout: post
title: "Reverse Engineering Code Art - Part 5"
author: Nimalan
tags: dev reverse-engineering
---

[City Limits](https://www.dwitter.net/d/18723) by [KilledByAPixel](https://www.dwitter.net/u/KilledByAPixel)

```js


eval(unescape(escape`𩡯𬠨𪰽𪐽𞐵𝰻𪐭𛐻𮀮𩡩𫁬𤡥𨱴𚁱🰰𞡫𚰲𚡲𚠨𫐥𝀭𜐮𝰩𛀷𝀰𚱲𛁱🱲🐱𩐸𞡲𛁱🱲𞠭𫐥𝰪𬠭𬠩𚑲👩🁫𛐲🰲𩐷𛱩𛱩𞠭𝱥𝐬𬐽𪐥𜠬𮀮𩡩𫁬𤱴𮑬𩐽𨁨𬱬𚀤𮱱🰭𬠯𝠺𫠽𪐫𭀪𜐲𜁽𘀤𮱱🱫𞠲𞑽𙐤𮱲🠰🱩𛰨𫠥𜠪𚠨𜰫𫐥𜰩🀱🰴𞐺𜐲𚐺𝠹𯐥𨀬𫐽𫠾🠵`.replace(/u../g,'')))


```

It's pretty amazing, but unfortunately I'm getting ~30 FPS, let's see how this goes

![City Limits](/assets/images/city_limits.png)

---

### Step 1: 

```js


for(k=i=957;i--;x.fillRect(q?0:k+2*r*(m%4-1.7),740+r,q?r=1e8:r,q?r:-m%7*r-r))r=i<k-2?2e7/i/i:-7e5,q=i%2,x.fillStyle=`hsl(${q?-r/6:n=i+t*120} ${q?k:29}%${r>0?i/(n%2**(3+m%3)<1?49:12):69}%`,m=n>>5


```

---

### Step 2: Format

```js
for (
  k = i = 957;
  i--;
  x.fillRect(
    q ? 0 : k + 2 * r * ((m % 4) - 1.7),
    740 + r,
    q ? (r = 1e8) : r,
    q ? r : (-m % 7) * r - r
  )
)
  (r = i < k - 2 ? 2e7 / i / i : -7e5),
    (q = i % 2),
    (x.fillStyle = `hsl(${q ? -r / 6 : (n = i + t * 120)} ${q ? k : 29}%${
      r > 0 ? i / (n % 2 ** (3 + (m % 3)) < 1 ? 49 : 12) : 69
    }%`),
    (m = n >> 5);
```

---

### Step 3: Rearrange Part 1

```js
const k = 957;
let q, r, m;
for (let i = 957; i--; ) {
  r = i < k - 2 ? 2e7 / i / i : -7e5;
  q = i % 2;

  const h = q ? -r / 6 : (n = i + t * 120)
  const s = q ? k : 29
  const l = r > 0 ? i / (n % 2 ** (3 + (m % 3)) < 1 ? 49 : 12) : 69

  x.fillStyle = `hsl(${h} ${s}%${l}%`;
  m = n >> 5;

  x.fillRect(
    q ? 0 : k + 2 * r * ((m % 4) - 1.7),
    740 + r,
    q ? (r = 1e8) : r,
    q ? r : (-m % 7) * r - r
  );
}
```

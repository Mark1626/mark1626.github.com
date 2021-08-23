---
layout: post
title: "Reverse Engineering Code Art - Part 6"
author: Nimalan
tags: dev reverse-engineering
excerpt_separator: <!--more-->
---

Available [here](https://www.dwitter.net/d/21831)

```js

c.style.filter=`sepia(`
for(var i=5e3;i--;f(960,610,300,t*i))f=(X,Y,s,r)=>s>1?f(X-s*S(r),Y-s*C(r),s/2,C(t+i)-r*2):x.fillRect(X,Y,t<4,.5)

https://www.dwitter.net/d/21827

c.style.filter=`sepia(`
for(i=5e3;i--;f(960,540,260,t*i))f=(X,Y,s,r)=>s>1?f(X+s*S(r),Y+s*C(r),s/2,S(i+t)*3-r*2):x.fillRect(X*1,Y,t<3,.7)

```

---
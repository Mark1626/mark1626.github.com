---
layout: post
title: "Reverse Engineering Code Art - Part 7"
author: Nimalan
tags: dev reverse-engineering
excerpt_separator: <!--more-->
---


Based on this [dwitter](https://www.dwitter.net/d/21596) by [rodrigo.siqueira](https://www.dwitter.net/u/rodrigo.siqueira)

```js

f=(X,Y,n=99)=>X<8?f(S(X)**2+S(Y+X)*Y*2-1,2*X*Y+.7,n-9):n
for(i=2e3;i--;c.style.filter=`sepia(`)x.fillRect(i,t*60,f(i/210-4.5,t/7-1.5)/40,1)

```

---
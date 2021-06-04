---
layout: post
title: "Exploring Obsured Code: Part -1"
author: Nimalan
tags: js
excerpt_separator: <!--more-->
---

This is an snippet I saved back in college. I'm not sure who the original author is for this. Let's try to understand how this works

```js
// A decimal to binary convertor
// All Credits to the original author
(_$=($,_=[]+[])=>$?_$($>>+!![],($&+!![])+_):_)(255);
```

<!--more-->

## Round 1

Let's format this

```js
(
  _$=($,_=[]+[]) => {
    return $?_$($>>+!![],($&+!![])+_):_
  }
)(255);
```

---

## Round 2

Rename to some readable variables

```js
// number is the number we are trying to convert to binary
// binary is the binary representation constructed so far
(
  fn = (number, binary=[]+[]) => {
    return number ? fn(number>>+!![],(number&+!![])+binary) : binary
  }
)(255);
```

## Round 3

Simplyfing some expressions

```js
// []+[] === ''
// !![] === true
// +true === 1
// (number&1) + '' === '0' | '1'
(
  fn = (number, binary = "") => {
    return number ? fn(number >> 1, (number & 1) + binary) : binary;
  }
)(255);
```

## Round 4

Simplyfing this down even further. Now this is a standard recursive decimal to binary convertor

```js
// From this (_$=($,_=[]+[])=>$?_$($>>+!![],($&+!![])+_):_)(255); to 
const fn = (number, binary = "") => {
  if (number) {
    binary = (number & 1) + binary;
    number >>= 1;
    return fn(number, binary);
  }
  return binary;
};
fn(255);
```
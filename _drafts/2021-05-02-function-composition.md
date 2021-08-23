
This example is taken from [here](https://github.com/vonloxx/js13k-2019)

<script type="text/javascript" id="MathJax-script" async
  src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js">
</script>

$$\begin{bmatrix}a & b & tx \\c & d & ty \\0 & 0 & 1\end{bmatrix}$$

Kummer's theorem states that for given integers n ≥ m ≥ 0 and a prime number p, the p-adic valuation $${\displaystyle \nu _{p}\left({\tbinom {n}{m}}\right)} {\displaystyle \nu _{p}\left({\tbinom {n}{m}}\right)}$$ is equal to the number of carries when m is added to n − m in base p.

It can be proved by writing $${\displaystyle {\tbinom {n}{m}}} {\tbinom  {n}{m}}$$ as $${\displaystyle {\tfrac {n!}{m!(n-m)!}}} {\tfrac  {n!}{m!(n-m)!}}$$ and using Legendre's formula.

## Inheritance

The traditional OOP way

```java
interface Geometry {
  int area();
  int perimeter();
}

interface Serialize { void write(); }

interface DeSerialize<T> { T read(); }

class Circle extends Geometry, Serialize, DeSerialize<Circle> {
  Circle(int radius) { this.radius = radius; }
  int area() { return 3.14 * this.radius * this.radius; }
  int perimeter() { return 2 * 3.14 * this.radius }
  Cirle read() { /* Some logic */ }
  void write() { /* Some logic */ }
}
```

---

## Function Composition or Functional Inheritance

The functional way of doing this

```js
  const Circle = compose(
    Geometry,
    Serialize,
    DeSerialize)({
      radius: 10,
    })
```

At the root of all this lies the `compose` function

```js
const compose = (...fns) =>
  fns.reduceRight(
    (prevFn, nextFn) => (...args) => nextFn(prevFn(...args)),
    (value) => value // Unity function
  );
```

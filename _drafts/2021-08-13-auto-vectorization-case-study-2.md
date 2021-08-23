---
layout: post
title: "Auto Vectorization Case Study 2"
author: Nimalan
tags: cpp c optimization vectorization hpc
excerpt_separator: <!--more-->
---

For this case study let's try to auto-vectorize an implementation of [Abelian sandpile model](https://en.wikipedia.org/wiki/Abelian_sandpile_model)

```cpp
void stabilize() {
  while(1) {
    int spills = 0;

    for (size_t y = 1; y <= pixel; ++y) {
      for (size_t x = 1; x <= pixel; ++x) {
          const int pos = y * points + x;
          char currSand = buffer[pos];
          char newSand = currSand >= 4 ? currSand - 4 : currSand;
          spills += currSand >= 4;

          newSand = newSand + buffer[pos - points] >= 4;
          newSand = newSand + buffer[pos + points] >= 4;
          newSand = newSand + buffer[pos-1] >= 4;
          newSand = newSand + buffer[pos+1] >= 4;

          state[pos] = newSand;
      }
    }

    std::swap(buffer, state);
    if (!spills) {
      return;
    }
  }
}
```

[Godbolt](https://godbolt.org/z/Tec6dGMhr)

<!--more-->

## Restructuring for auto vectorization

```cpp
const int pixel = 1<<8;
const int points = 1<<8;

void stabilize(char* buffer, char* state) {
  int spills = 0;

    for (size_t y = 1; y <= pixel; ++y) {
      for (size_t x = 1; x <= pixel; ++x) {
          const int pos = y * points + x;
          char currSand = buffer[pos];
          char newSand = currSand >= 4 ? currSand - 4 : currSand;
          spills += currSand >= 4;

          newSand = newSand + buffer[pos - points] >= 4;
          newSand = newSand + buffer[pos + points] >= 4;
          newSand = newSand + buffer[pos-1] >= 4;
          newSand = newSand + buffer[pos+1] >= 4;

          state[pos] = newSand;
      }
    }

    std::swap(buffer, state);
    if (!spills) {
      return;
    }
}
```

To make this reable I'm going to be extracting the `y*points + x` as an inline function

```cpp
const int pixel = 1<<8;
const int points = 1<<8;
inline size_t resolveIdx(size_t y, size_t x) { return y * points + x; }

void stabilize(char* buffer, char* state) {
  int spills = 0;

  for (size_t y = 1; y <= pixel; ++y) {
    for (size_t x = 1; x <= pixel; ++x) {
      char currSand = buffer[resolveIdx(y, x)];
      char newSand = currSand >= 4 ? currSand - 4 : currSand;
      spills += currSand >= 4;
      // Spill over from neighbours
      newSand += buffer[resolveIdx((y - 1), x)] >= 4;
      newSand += buffer[resolveIdx((y + 1), x)] >= 4;
      newSand += buffer[resolveIdx(y, (x - 1))] >= 4;
      newSand += buffer[resolveIdx(y, (x + 1))] >= 4;

      state[resolveIdx(y, x)] = newSand;
    }
  }
}
```

## OpenMP

```cpp
const int pixel = 1<<8;
const int points = 1<<8;
inline size_t resolveIdx(size_t y, size_t x) { return y * points + x; }

void stabilize(char* buffer, char* state) {
  int spills = 0;

  for (size_t y = 1; y <= pixel; ++y) {
    #pragma omp simd
    for (size_t x = 1; x <= pixel; ++x) {
      char currSand = buffer[resolveIdx(y, x)];
      char newSand = currSand >= 4 ? currSand - 4 : currSand;
      spills += currSand >= 4;
      // Spill over from neighbours
      newSand += buffer[resolveIdx((y - 1), x)] >= 4;
      newSand += buffer[resolveIdx((y + 1), x)] >= 4;
      newSand += buffer[resolveIdx(y, (x - 1))] >= 4;
      newSand += buffer[resolveIdx(y, (x + 1))] >= 4;

      state[resolveIdx(y, x)] = newSand;
    }
  }
}
```

## Encapsulating the function as a class

```cpp
const size_t pixel = 1 << 8;
const size_t points = pixel;
const size_t size = points * points;

class Sandpile {
  void stabilize(char *state, char *buffer);
  inline size_t resolveIdx(size_t y, size_t x) { return y * points + x; }
};

void Sandpile::stabilize(char *state, char *buffer) {
    size_t spills = 0;
    for (size_t y = 1; y <= pixel; ++y) {
      #pragma omp simd
      for (size_t x = 1; x <= pixel; ++x) {
        const int pos = y * points + x;
        char currSand = buffer[pos];
        char newSand = currSand >= 4 ? currSand - 4 : currSand;
        spills += currSand >= 4;
        // Spill over from neighbours
        newSand = newSand + buffer[pos - points] >= 4;
        newSand = newSand + buffer[pos + points] >= 4;
        newSand = newSand + buffer[pos-1] >= 4;
        newSand = newSand + buffer[pos+1] >= 4;

        state[pos] = newSand;
      }
    }

    // print();
    std::swap(buffer, state);
    if (!spills) {
      return;
    }
}
```

For some reason with the signature

```cpp
// Work
class Sandpile {
  void stabilize(char *state, char *buffer); 
  inline size_t resolveIdx(size_t y, size_t x) { return y * points + x; }
};

// Does not allow for vectorization
class Sandpile {
  char *state;
  char *buffer;
  void stabilize();
  inline size_t resolveIdx(size_t y, size_t x) { return y * points + x; }
};


```

```cpp
const size_t pixel = 1 << 8;
const size_t points = pixel;
const size_t size = points * points;

class Sandpile {
  vector<char> _state;
  vector<char> _buffer;
private:
  inline size_t resolveIdx(size_t y, size_t x) { return y * points + x; }
  // __restrict__ as we know there will be no overlap
  void stabilize(char *__restrict__ state, char *__restrict__ buffer) {
    size_t spills = 0;
    for (size_t y = 1; y <= pixel; ++y) {
      #pragma omp simd
      for (size_t x = 1; x <= pixel; ++x) {
        const int pos = y * points + x;
        char currSand = buffer[pos];
        char newSand = currSand >= 4 ? currSand - 4 : currSand;
        spills += currSand >= 4;
        // Spill over from neighbours
        newSand = newSand + buffer[pos - points] >= 4;
        newSand = newSand + buffer[pos + points] >= 4;
        newSand = newSand + buffer[pos-1] >= 4;
        newSand = newSand + buffer[pos+1] >= 4;

        state[pos] = newSand;
      }
    }

    // print();
    std::swap(buffer, state);
    if (!spills) {
      return;
    }
  }

  void computeIdentity() {
    // f(ones(n)*6 - f(ones(n)*6)
    char* buffer = _buffer.data();
    char* state = _state.data();

    for (size_t y = 1; y <= pixel; ++y) {
      for (size_t x = 1; x <= pixel; ++x) {
          const int pos = y * points + x;
        buffer[resolveIdx(y, x)] = 6;
      }
    }

    stabilize(buffer, state);

    for (size_t y = 1; y <= pixel; ++y) {
      for (size_t x = 1; x <= pixel; ++x) {
        buffer[resolveIdx(y, x)] = 6 - state[resolveIdx(y, x)];
      }
    }

    stabilize(buffer, state);
  }

};
```

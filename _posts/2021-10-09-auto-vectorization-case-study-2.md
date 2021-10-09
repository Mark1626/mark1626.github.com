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

Explore this example in [Godbolt]https://godbolt.org/#z:OYLghAFBqd5TKALEBjA9gEwKYFFMCWALugE4A0BIEAZgQDbYB2AhgLbYgDkAjF%2BTXRMiAZVQtGIHgCYBQogFUAztgAKAD24AGfgCsp5eiyahUAUmkAhC5fIrGqIgSHVmmAMLp6AVzZMDbgAyBEzYAHK%2BAEbYpFIA7OQADuhKxM5Mnj5%2BBsmpTkLBoRFs0bE8CfbYjukiRCykRJm%2B/jx22A75TLX1RIXhUTHxdnUNTdmtSiO9If0lg%2BUAlHbo3qSonFwWAMwhqD44ANRmW%2B6TpCHAx7hmWgCCGEyTByFEB4kE6u1HWwAiBzzHdyAgAcx2sdweTxeb3QLyU3z%2BAJOILBN1uIXoMwOqQAXtgAPqvUjYJReABu2AAkph1BBcQTXgBPcjYgh4wkHdQLI5xSwHYlEVZMA6Mg4AKhhcKOVk5YJ5PzRaLJsMwBxoTAgqCQ9QlkW8NBoMRZWp12LqRGw3LMvLRB2ewmx73o9Hhxz%2BWlRd1tarIBzpbIZIoR/zlosBbreH3acpsNkZVptdztdu2iVILGAbBYB3QbESrLYmG9dsEpD99I56mDSL5VfDv0jn3oMasNi5PPBt2TyZNZdQq1IImMqojeoNMTMAFZLMTSfQKdTaczOQspwqtp3u3bewdQgB3IdMEcN/ukQfD77XBsAFm%2BADEDqfz0eDgBaA63kCPgeHosb4vJkoToutK1gnj%2BF5XBG16el2W4APTwQcIjATmFJljQpC5ru2AEMASCRCspBKABdr7r%2BoGjvqhqkFOM4kuSVI0lAorvjwSwrmul7QbBpFmiwFp0bOjGLhAy5clxEbkcOsHdtaCpJvKipxD8XBLPQ3CTvw/hcDo5DoNwQKtjKpKrOs0pbHw5BENoalLAA1iAWxbAAdAAbFoWzXtePBbHEbmTpOWhubIGlcNe/BsCAPkuQAnNIcRxDwWjAtezlxFsk7kDpekGVw/BKCAWjWbZSxwLAKAYDg%2BDEGQlDUHQjCsBw3BWYIwhiBInA8NecjCMoaiaLpeggKFximLGVhtB06SuEeYwtFs5BBDMxSlFIxW5GkQgLVIS1bZ0fRrfMxWVNUQjdKMXjNHt01VJ0l3TEUAxlKdUy7b5ww9EdL0bUsplrBs2y7Ps2DfKcRDnCYUEQkIUIOu8TbVvW7igv%2BsOPK80LJFKEZIkCJxo52GJYhWRIMfOTG0mTIosjT7bWnyApCkGEo48IroyuoMYqYqdzKgQqrqpq2qkLq1FGo%2BosSpMAmWh23rQkBDAgRGHro7c3qluWAYcmGDY1kG9Z/Ij0YbpRVjxgriklr6/rsq8dYG3KTsEybUbNubk2WAziZwd2O5PhRVHjrR07CZToniauk7rpuW47tJL4RkHkFbFefy3scD6py%2B76ft%2BZ6/rJW7K86nNgX8ufHhnH4l92iHIah6DoWqWFsDheEEURJE28mScjq2DZjjRQkUwuzFiW%2B/wcRJsfcTevF93asuCeH49U2JLJz38UnYAeMka3JvOKfJymqepmnabZ%2BmGd72JEeZ2zSPwNnDQsSxINgLA4LEECX%2BFSKIBJzAhcloOI0hpDAlijwScbkQpuWvLFNy2Ub55QKkVEq78HKjWkC5IK0CeAhWBAFOIPlrxZTClsa%2Bw1b75SwToMqiByrIDQLmJ0RoqCanYQwQYwAeAyAEAwC0xFqCRBvpEEI9RGStX4BgNgHBhAAHkmD0BkbQnAWYTCSA0QQYk1QKSFVodgT4/YLSyMoMIdoN9MSRHTKQRkngcA30hgQKKvA1ICCMMAJQAA1Ag%2B8lGJGYBY9qohxCSB6n1RQKgNA330K0IwJg0De0MAQSIhVIBLHQIkToRjXxKK2G%2BdU6BXyQ2wNgV8FJHBkADMUnJzA8wFXaPdWaEA3AfWWkeH6cwyhJBSNtDI11xj9LyOkHp60JgtPOl0d6wyWh3RmY9CZ8wvpXSyAs2WDQVllH%2Bo/bq1liQbD4AArSqDaF5XUCQ18iCDjAFQKgf4PAXLSD9EZawU0Dg1RIGWbYrQDieDzLw350hLILFfqVHBSCXIQNioQ2KcC4jAgSok7gEVyBRSCuc3K3AMHFTfow8gLCICVR4YwCgXD5EcNiPwwRjURGFQgOI2hkjWAOIsfIxRRAVFqJvpo8aOi9KEH0U4QxN8TFVG8OYjxliLRhT0rY%2BxjisAbD0q49xJyvEZj8QEvcQSQkyrCZ1SJvUwkDTibQ/QY1knmGMrYWxmT/76VyekfJhTmkzRcO0%2Ba8yAjdNWr9VoB10idODQUANvSDBnQenMjZUbpkxu%2BhGyZazGi%2BomFMHZUg9lmU4LIcpxzPFhTOTlfglzrm3PuY8gRLy3mpK%2BYQH5FlZAArJTEZt4KGF2XIF/H%2BgwnVhXRZi4qpa6F4q7R/cgjlpCxXcvFNyMhYoZUSiQyh3BqHYrLbiidRLmEoEIAaeqtB5DGu6qa%2BQ5qhoKqQIVRJN6D00CIIyYJmDSA3tGuQN9SgH1PpfVoU5NCcVcB%2BAQA0Bx/H73bVctyNzbxVqebWsk8JoOwbuQ8hDL8J1QriDCuF144jgK2Mg/D0hYGGDRYBrd9DCr4sheRrgmHR3oKw%2BQdCqQXDXiAA%3D%3D%3D)
or [here](https://godbolt.org/z/Tec6dGMhr)

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

For some reason with the signature I wasn't able to auto vectorize it

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

Final auto vectorized verison.

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

---
layout: post
title: "Node Module System"
author: Nimalan
tags: nodejs loader module
excerpt_separator: <!--more-->
---

Similar to the article I wrote about [Lua module loaders](https://mark1626.github.io/posts/2021/04/21/lua-module-loader/), the same can be done in `nodejs`. We can override the `require` to be able to load custom extensions

Wait a minute is there any practical use case other than a syntax hack? 

Well then how about we build a loader so nodejs can read yaml

```js
require("./loader")
const config = require("config.yaml")
const port = config.port || 3000;
const http = require('http');

const requestListener = function (req, res) {
  res.writeHead(200);
  res.end('Hello, World!');
}

const server = http.createServer(requestListener);
server.listen(config.port);
```

This looks way more practical so let's begin.

TLDR; Leaving a link to the [source code](https://github.com/Mark1626/Paraphernalia/tree/master/node-module-extensions) I made for this example

<!--more-->

## Understanding the Module system

Before we get into this, have you seen stack traces similar to these before? In this case I tried to run node on a non existent file

```
❯ node test
internal/modules/cjs/loader.js:883
  throw err;
  ^

Error: Cannot find module 'path/to/file'
    at Function.Module._resolveFilename (internal/modules/cjs/loader.js:880:15)
    at Function.Module._load (internal/modules/cjs/loader.js:725:27)
    at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:72:12)
    at internal/main/run_main_module.js:17:47 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}
```

What I'm trying to highlight here is the `internal/modules/cjs/loader.js`, `internal/modules/run_main.js`, `MODULE_NOT_FOUND`

### Module System

[Source@nodejs](https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js)

Every module in `nodejs` is converted into a function wrapper of the following structure

```js
(function(exports, require, module, __filename, __dirname) {
// Module code actually lives in here
});
```

- The module object is where we export our code in `module.exports`
- Next this conversion is done by a module loader

### Main Module

When a file is run with `node`, it is set as the main module `require.main`, this is what we saw in the first call `internal/modules/run_main.js` earlier in the stack trace

The main module is run inside the VM

### Module._load

[Source@nodejs](https://github.com/nodejs/node/blob/7c8a60851c459ea18afbfc54bfc8cf7394ea56c3/lib/internal/modules/cjs/loader.js#L753)
[Source@nodejs](https://github.com/nodejs/node/blob/7c8a60851c459ea18afbfc54bfc8cf7394ea56c3/lib/internal/modules/cjs/loader.js#L977)

1. First it checks if the module is present in cache
2. Create a new module and save it to cache
3. Call `module.load`
  - Call `Module._extensions[extension](this, filename);`

### Module._extensions

`_extensions` contains loaders for all the different file extensions in `nodejs`. Loaders finally populate the `module.exports`

In the stacktrace earlier the file is loaded with the `cjs` loader hence the `internal/modules/cjs/loader.js` in the trace

In the JSON loader it's just a simple `module.exports = JSON.parse(content)`

#### Native module loaders in NodeJS

1. [CJS Loader](https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js#L1118-L1139)
2. [Json Loader](https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js#L1143-L1157)
3. [Node(.node) Loader](https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js#L1161-L1169)

### Module._compile

[Source@nodejs](https://github.com/nodejs/node/blob/7c8a60851c459ea18afbfc54bfc8cf7394ea56c3/lib/internal/modules/cjs/loader.js#L1063)
[Create Require Source](https://github.com/nodejs/node/blob/7c8a60851c459ea18afbfc54bfc8cf7394ea56c3/lib/internal/modules/cjs/helpers.js#L49)

This does the actual work. It create a new require instance

- Run the file contents in the correct scope. Expose the correct helper variables (require, module, exports) to the file.
- Returns exception, if any.

Unfortunately I can't get into the depths of this in this article, so let's save this for later

---

## Creating our own module extensions

> **Note:** There will always be a better way to do this than to override require, **do not use this in production without knowing what you are doing**. As per the [Nodejs docs](https://nodejs.org/api/modules.html#modules_require_extensions) this is considered deprecated as it could mess with performance.

Despite the warning this is how things work under the hood, let's continue for our understanding

### Case 1: Module loader for YAML

```js
// Load the yaml as JSON into the variable config
const config = require("./config.yaml")
```

Since this is a POC I'm going to be using the npm package `yaml` for the parsing

```js
const fs = require("fs");
const yaml = require("yaml");

/*
 Loader for yaml, based on the json loader in nodejs
 https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js#L1143-L1157
*/
function yamlLoader(mod, filename) {
  const content = fs.readFileSync(filename, "utf8");

  try {
    mod.exports = yaml.parse(content)
  } catch (err) {
    err.message = filename + ": " + err.message;
    throw err;
  }
}

Module._extensions[".yaml"] = yamlLoader;
Module._extensions[".yml"] = yamlLoader;
```

That's pretty much it!!!!

#### How does this work?

- `Module._extensions` contains the loaders for each extension
- We simply need to add a function to handle `.yaml` and `.yml` files
- The loader is a function which takes `module` and `filename` as arguments
  - `filename` is self explanatory, the name of the file
  - The `module` refers to the module which I described in the previous section. By setting the `module.exports` we define how a file has to be loaded

### Case 2: Extending JS file syntax

```js
// cube.js
class Cube {
  constructor(side) {
    $.side = side
  }

  area() {
    return $.side * $.side
  }
}
// fn.js
const greet = fn (nm) {
  console.log('Hello ' +  nm)
}

greet('mark')
```

For this I'm going ahead with the same loader I used in my Lua module loader article 

```js
const transform = (code) => {
  const patterns = [
    { patt: /\$/g, repl: "this" },
    { patt: /fn \(/g, repl: "function (" },
  ];

  patterns.forEach((pattern) => {
    code = code.replace(pattern.patt, pattern.repl);
  });
  return code;
};
```

Now we additionally also have to extend the existing `cjs` loader, this is not quite straight forward as the yaml loader we made

```js
const oldLoader = Module._extensions[".js"];
/**
 * Simplified version of the code from pirates
 * MIT License
 * Copyright (c) 2016-2018 Ari Porad
 * https://github.com/ariporad/pirates/blob/master/LICENSE
 */
Module._extensions[".js"] = function customLoader(mod, filename) {
  let compile = mod._compile;
  mod._compile = function _compile(code) {
    // reset the compile immediately as otherwise we end up having the
    // compile function being changed even though this loader might be reverted
    // Not reverting it here leads to long useless compile chains when doing
    // addHook -> revert -> addHook -> revert -> ...
    // The compile function is also anyway created new when the loader is called a second time.
    mod._compile = compile;
    const newCode = transform(code);

    return mod._compile(newCode, filename);
  };

  // Run the original loader
  // https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js#L1118-L1139
  oldLoader(mod, filename);
};
```

#### How it works

JS files will have to be compiled for them to work, since a new compile function is too complex, we will have to rely on the old one

1. Store the original `CJS` loader
2. Creating a new `mod._compile` function
  1. Store the original `_compile` function
  2. Run transform over the original code
  3. Run `mod._compile` the original compile function over the new code
3. Run the original `CJS` loader, this will now compile the module

---

## Reference

- [NodeJS Module API](https://nodejs.org/api/modules.html)
- [Module.js](https://github.com/nodejs/node/blob/master/lib/module.js)
- [Require System](http://fredkschott.com/post/2014/06/require-and-the-module-system/)

## See Also

- [Source Code of the examples](https://github.com/Mark1626/Paraphernalia/tree/master/node-module-extensions)
- [Pirates - require hijack](https://github.com/ariporad/pirates)

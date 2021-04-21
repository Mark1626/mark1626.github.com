---
layout: post
title: "Lua Module Loader"
author: Nimalan
tags: dev css frontend
excerpt_separator: <!--more-->
---

What if I told you there is a way to extend the default syntax of Lua? In the below example I use `@` as an alias for `self`, and `fn` as an alias of `function`. This and may more can be achived with the module loader in Lua

```lua
-- myfile.lua
local greet = fn(name)
  print('Hello ' .. name)
end

greet('mark1626')

---
-- cube.lua
Cube = {a = 1}

function Cube:new(o)
  o = o or {}
  setmetatable(o, @)
  @.__index = @
  return o
end

function Cube:area()
  return @.a * @.a
end

return Cube
```

<!--more-->

## Module Loader

The [package loaders](http://www.lua.org/manual/5.1/manual.html#pdf-package.loaders) is a table used by require to load modules. This can be overridden with a simple `table.insert` to add our custom logic

In the below I implement a custom loader that runs a function `transform` over the contents of the file

```lua
local custom_loader = function(modulename)
  local modulepath = string.gsub(modulename, "%.", "/")
  for path in string.gmatch(package.path, "([^;]+)") do
    local filename = string.gsub(path, "%?", modulepath)
    local file = io.open(filename, "rb")
    if file then
      local content = assert(file:read("*a"))
      local transformed_file = transform(content)
      return assert(loadstring(transformed_file, modulename))
    end
  end
  return "Unable to load file " .. modulename
end

-- Override the default loader
table.insert(package.loaders, 2, custom_loader)
```

> **Note:** This will work on all the future require after importing this module

## Transformation Use Case

Now let's have a look at the first example I posted

```lua
local greet = fn(name)
  print('Hello ' .. name)
end
```

This is the transform function I use to achieve this uses a simple string replace. `fn(` is converted into `function(`

```lua
-- This will transform some patterns in our file
local function transform(s)
  local str = s
  local int = "([%d]+)"
  
  local patterns = {
    { patt = "@", repl = "self" },
    { patt = "&&", repl = " and " },
    { patt = "||", repl = " or " },
    { patt = "fn%(", repl = "function(" },
  }

  for _, v in ipairs(patterns) do str = str:gsub(v.patt, v.repl) end
  return str
end
```

## References

- [Package Loaders - Luai](https://pgl.yoyo.org/luai/i/package.loaders)
- [Lua Module Loader - Lua Users](http://lua-users.org/wiki/LuaModulesLoader)

## See Also

- First saw this pattern in usage [here](https://github.com/4v0v/k1n3m4t1ks/blob/master/monkey.lua), kudos to the author [4v0v](https://github.com/4v0v)
- [Example](https://github.com/Mark1626/Paraphernalia/tree/master/lua-package-loader)

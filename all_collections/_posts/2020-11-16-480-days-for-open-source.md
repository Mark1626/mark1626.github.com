---
layout: post
title: "480 days for open source"
author: Nimalan
tags: dev open-source
---

450+ days and 2 major releases, and several smaller PRs to support the feature later it merged into master

Should be available in Jest 27

- [Transform jest environment](https://github.com/facebook/jest/pull/8751)
- [Transform jest test-runner](https://github.com/facebook/jest/pull/8823)
- [Transform jest runner](https://github.com/facebook/jest/pull/8854)

### What is this feature:

If your project uses Babel or TS and you are using Jest it works out of the box to transform the files before running the tests. A common pattern is to use `globalSetup` and `globalTeardown` which do as their name suggests, other than these if you need more control there is the `testEnvironment` module which you can use to add hooks at a more fine grained level. However some of these modules don't support using Babel or TS and require you to write in CommonJS. These PRs are for adding transform support in a subset of modules

```js
// jest.config.js
module.exports = {
  testEnvironment: 'environment.ts',
  runner: 'runner.ts',
  transform: {
    '^.+\\.ts?$':  'my-transform'
  }
}
```

You can check out the issue for the whole list of modules, in the umberalla issue I created for this

[Support transforming all modules](https://github.com/facebook/jest/issues/8810)

### Background Context:

It started with a previous project where we had a requirement to dump data into the DB before a test and cleanup once it is done, I went ahead with utilizing the `testEnvironment` feature of Jest in the spike for it's flexibility. Which gave me a bit of exposure to Jest's codebase.

I learnt TS entirely from working on the Jest codebase. Originally planned for Jest 25, this feature was however postponed for more than a year since this was a breaking change and Facebook felt the impact was high(this would be for people who wrote custom modules, would not affect normal usecases). This feature however got requested a lot and I finally got to land it in master on 14-11-2020, 480 days from the first PR(25 July 2019).

### Memorable moments:

- Going through the entire code of yarn pnp to understand how `module.load` works, this lead me to discover the internal `Module._extensions` in nodejs
- When working on TS on a monorepo, the TS compiler is a lifesaver in a large codebase
- In the whole span of work I had to change the minimum support Node version twice in the changes
- yarn2 `berry` is incredible to use(this came in much later), the `portal:`, `link:` protocol are huge improvements

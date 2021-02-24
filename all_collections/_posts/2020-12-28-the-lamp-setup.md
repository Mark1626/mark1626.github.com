---
layout: post
title: "The lamp setup"
author: Nimalan
tags: dev redis nodemcu
---

You can see the [full source](https://github.com/Mark1626/Paraphernalia/tree/master/the-lamp) here

![The Lamp](/assets/images/the-lamp.jpg)

---

## Approach 1 - Crazy Spike Ideas

- NodeMCU registers itself in the Poorman's Service Discovery(PSD).
- Orchestrator contacts all the nodes which are registered

#### Poorman's Service Discovery(PSD)

- CGI server which stores the `ip` and `updatedAt` in an `sqlite` db

### Architecture

![PSD Sequence Diagram](/assets/images/psd.png)
![Orchestrator Sequence Diagram](/assets/images/orchestrator.png)

---

## Approach 2 - Redis for the rescue

- Redis pub/sub for communicating with NodeMCU

### Architecture

![Lamp Architecture](/assets/images/redis-lamp.png)

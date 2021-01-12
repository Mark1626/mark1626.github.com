---
layout: post
title: "A bare minimal http server"
author: Nimalan
tags: dev network server
---

## Now how did we get here?

Some time back I noticed that you can't run a Spring Boot starter with Hibernate in a container with 200M memory.

[StackOverflow on this](https://stackoverflow.com/questions/44491257/how-to-reduce-spring-boot-memory-usage)  
`The bare minimum you'll get away with is around 72M total memory on the simplest of Spring Boot applications with a single controller and embedded Tomcat`

Now this just for including the JARs, throw in a couple of endpoints and entities and now your infra is struggling to keep 5 microservices running and you still have a pathetic response time

## Ok, so what?

I run a server in my Raspberry Pi which serves files and some endpoints.
So now the problem statement is `What's the bare minimum http usable server?`.

#### Requirements

##### Do's

- Minimal memory usage
- Minimal size
- Usable server
- Low power consumption (Raspberry Pi's temp has to be below 50C)

##### Don'ts

- Bare network sockets for a single endpoint, it has to be a compliant HTTP server where you can add endpoints and do stuff at a reasonable timeframe

#### Mentions

- You can create a `go` binary if you want to but I don't think you can beat my size rule(see my last attempts)

----

## Attempt 1 - Caddy

```sh
localhost {
	reverse_proxy /api/* localhost:8081

	file_server /books/*
}
```

This was my first attempt, I had several different services, I used Caddy as a reverse proxy, a 
file server. Better than Spring Boot, easier to set up `https` and I just like 
`Caddy`, but it's still no where near my target, and unfortunately the temperature on my Pi was also not very good

![Pi Arch Temperature](/assets/images/pi_caddy_temp.png)

## Attempt 2 - Go Binary

```go
router.Static("/public", path.Join(usr.HomeDir, "public_html"))

v1 := router.Group("/v1")
{
  v1.GET("/bookmarks", apiV1.FetchBookmarks)
  v1.POST("/add", apiV1.AddBookmark)
  v1.StaticFile("/readable", path.Join(writePath, "dbbooks.txt"))
}
```

Now I went with a Gin server

I have to say this is extremely good, I was skeptical that it might have a large footprint, it's so good that I still run this service in my Pi

With the server and plenty of other services running Pi uses `56MB`, the executable is itself `14629696` bytes a bit around `14MB`, and you will see that the temperature is less than `50C` mostly, the spike is when I was working over `ssh` in Pi

![Pi Arch Memory](/assets/images/pi_arch.png)
![Pi Arch Temp](/assets/images/pi_arch_temp.png)

## Attempt 3 - CGI

Now let's really break the limits. The `14MB` of the executable is due the VM bundled inside, now how do we get rid of that?
I could write it in C, but that would learning a framework or library in C which would handle http requests.

A couple of months ago I noticed that the Apache Http Server has a program called [httpd](https://httpd.apache.org/docs/2.4/programs/httpd.html). This is from the documentation

```
httpd is the Apache HyperText Transfer Protocol (HTTP) server program. It is designed to be run as a standalone daemon process. When used like this it will create a pool of child processes or threads to handle requests.

In general, httpd should not be invoked directly, but rather should be invoked via apachectl
```

Let's break that down shall we. The Apache Http Server uses a daemon process `httpd` to handle requests. Then what would be the actual handler of the request? Can we write a custom handler for the request?

Writing a custom handler for the request would result in us only having to run a `httpd` daemon, so let's do that

### CGI (Common Gateway Interface)

The CGI is an interface which allows to execute cli applications on a server.

So with this I should be able to run shell scripts, handle requests with zero dependency other than `sh`

A simple `hello world` in CGI. The only cache is that I have to structure it as HTTP response, but that's ok

```sh

#!/bin/sh
"Content-type: text/html"
echo ""
echo "Hello World"
echo ""
echo ""
```

An endpoint to show the Uptime of the server

```sh

#!/bin/sh
echo "Content-type: text/html"
echo ""
uptime
echo ""
echo ""
```

Let's try a more complex example where I'm serving a `GET` reading some data from a sqlite DB

```sh

#!/bin/sh
echo "Content-type: text/html"
echo ""
echo "<p>"
echo ""
echo ""
echo $QUERY_STRING | awk '{split($0, arr, "="); print arr[2]; }' | xargs -I {} sqlite3 /path/to/your.db "select username from name_service where name = \"{}\""
echo ""
echo "</p>"
echo ""
echo ""
```

```
// docker images
REPOSITORY                         TAG                 IMAGE ID            CREATED              SIZE
cgi-server                         0.0.10              6f338996f1b3        About a minute ago   7.66MB

// docker stats
CONTAINER ID        NAME                CPU %               MEM USAGE / LIMIT   MEM %               NET I/O             BLOCK I/O           PIDS
034401be55f6        bold_neumann        0.00%               324KiB / 1.945GiB   0.02%               1.05kB / 0B         0B / 0B             1
```

It uses about `326KiB` memory and the entire image with `sqlite3`, `busybox httpd` comes to `7.66MB`. I'll leave it here for now

## Future Options

- `httpd` can be a rather lightweight reverse proxy
- [Fast CGI](https://en.wikipedia.org/wiki/FastCGI) is a variant protocol which reduces the overhead serving the request
- [Inetd](https://en.wikipedia.org/wiki/Inetd) is a honorable mention, I skipped it as I wanted to be a bit practical in the time I spend to create a new endpoint

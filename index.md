---
layout: page
permalink: /
permalink_name: /
title: Hello
---

Hello and welcome to my site

## Where to start

- [Blog](/blog)
- [Micro Blog](/micro-blog/twtxt.txt)
- [Projects](/projects)
- ["Knowledge" Document Everything](/knowledge)
- [Road to CPP and HPC](https://github.com/Mark1626/road-to-plus-plus)

## Recent Work

Most of my work right now is going into my C++ journey repo [Road to C++ and HPC](https://github.com/Mark1626/road-to-plus-plus)  

{% for pen in site.data.codepen %}
  <h2>{{ pen.name }}</h2>
  <p class="codepen" data-height="372" data-theme-id="dark" data-default-tab="html,result" data-user="mark854" data-slug-hash="{{ pen.hash }}" style="height: 372px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;" data-pen-title="{{ pen.name }}">
    <span>See the Pen <a href="https://codepen.io/mark854/pen/{{ pen.hash }}">
    House | Pure CSS</a> by nimalan (<a href="https://codepen.io/mark854">@mark854</a>)
    on <a href="https://codepen.io">CodePen</a>.</span>
  </p>
{% endfor %}

<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

## Recent updates

- Integrated [Tutorial Markdown](https://github.com/tholman/tutorial-markdown) into the blog, this should make for some interactive JS related blogs

## What am I reading?

Currently reading <a href="{{ site.data.books[0].url }}"> {{ site.data.books[0].name }} </a>

#### What have I read so far this year?

<ul>
{% for book in site.data.books %}
  <li>
    <a href="{{ book.url }}">
      {{ book.name }}
    </a>
  </li>
{% endfor %}
</ul>

#### Previous Years

- [Books in 2020](/books/2020)
- [Books in 2019](/books/2019)

---
layout: page
permalink: /blog
permalink_name: /blog
title: Blog Posts
---

# All Posts

<ul>
  {% for post in site.posts %}
    <li>
      <a href="{{ post.url }}">{{ post.title }}</a>
    </li>
  {% endfor %}
</ul>

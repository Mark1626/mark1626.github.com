---
layout: blog
permalink: /blog
permalink_name: /blog
title: Blog Posts
---

<ul>
  <h3>All Posts</h3>
  {% for post in site.posts %}
    <li>
      <a href="{{ post.url }}">{{ post.title }}</a>
    </li>
  {% endfor %}
</ul>
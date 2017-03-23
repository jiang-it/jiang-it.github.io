---
layout: default
title: Writings
permalink: /writings/
---

<div class="posting">
{% for post in site.posts %}
    {% if post.type == "Writing" %}
        <h3><a href="{{ post.url }}">{{post.title}}</a></h3>
        <small> {{ post.date | date_to_long_string }} </small>
        {{ post.excerpt }}
    {% endif %}
{% endfor %}
</div>

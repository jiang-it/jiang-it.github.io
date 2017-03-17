---
layout: default
---

<div class="posting">
{% for post in site.posts %}
    <h3><a href="{{ post.url }}">{{post.title}}</a></h3>
    <small> {{ post.date | date_to_long_string }} </small>
    <small> {{ post.type }} </small>
    {{ post.excerpt }}
{% endfor %}
</div>

Something <span data-balloon="Comment!"> that has a comment </span>

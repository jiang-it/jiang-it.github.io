---
layout: default
title: "Novelty"
date: 2022-01-30

type: Project
categories: novelty react
---

Novelty is a word game where the player picks letters and then, using the tiles they picked, tries to spell the highest scoring word.

When picking tiles, half of the unpicked tiles are replaced by new tiles while half remain to be potentially picked next.

Every day, there is also a random modifier, which incentivizes spelling words with restrictions.

The game resets daily, so people can compare the different words they came up with that day.

<div id="novelty_game_container"></div>

<!-- Load React. -->
<script src="https://unpkg.com/react@16/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@16/umd/react-dom.production.min.js" crossorigin></script>

<!-- Load our little css and js -->
<link rel="stylesheet" type="text/css" href="{{ site.baseurl }}/assets/singleplayer-novelty/index.css">
<script src="{{ site.baseurl }}/assets/singleplayer-novelty/CollinsScrabbleWords2019.js"></script>
<script src="{{ site.baseurl }}/assets/singleplayer-novelty/novelty.js"></script>

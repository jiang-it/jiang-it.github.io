---
layout: default
title:  "PPL@FB"
date:   2017-10-05

type:  Note
categories: facebook probabilistic programming
---
If I had known at the end of my internship that, were I to return Facebook, that I would be working on the same project as I had during my internship, I would be working at Microsoft.

Yet, here I am, the newest member of the probabilistic programming language team at Facebook. My decision to join was not easily made – there were other teams that I would have been thrilled to join – and it certainly did not help that the team’s project is risky and success, uncertain. 

After all, probabilistic programming still, for the most part, exists in the land of academia – a realm whose problems are vastly different from Facebook’s. As a result, academia’s vision of probabilistic programming differs from the vision our director, Erik Meijer, has. At the very least, it would unexpected for an essay titled <a href="http://queue.acm.org/detail.cfm?id=3055303">“Making Money using Math”</a> to come out of academia. If that essay is not a clear enough picture of his vision for probabilistic programming at Facebook, he travels frequently to give <a href="https://popl18.sigplan.org/track/pps-2018">talks on the subject that you can attend</a> and pick his brain. 

However, before one can even begin to get to the point of making money, a huge amount of work must be done so that probabilistic programming is successful at Facebook: 
1. Competing tools: Traditional machine learning tools like neural nets and random forests are already being used for prediction problems in production. For probabilistic programming to be successful, it needs to either solve different problems or better solve existing problems.
2.  Problem space: It is unclear whether the problems that probabilistic programming is best suited for are large enough to warrant the investment in the team. Currently, academia has identified several problems that probabilistic programming seems to excel at, such as facial reconstruction and location tracking, but these problems are narrow and existing probabilistic programming languages already exist for some of these problems. Does Facebook need to be investing in a general purpose one? 
3. Speed: At Facebook’s scale of 2 billion users, any probabilistic request needs to be fast. Unfortunately, that is not necessarily something probabilistic programming is known for. Especially if that probabilistic program is written in single threaded php. 

Unfortunately, none of these problems have easy solutions. After working on and reading about probabilistic programming last summer, I was aware of these problems when I joined the team this fall. I am still uncertain about the success of the team. Despite all of this, I think that were good enough reasons for me to join the team.

It just so happened to work out that I stumbled across an opportunity to work on a language in OCaml, something that I can check off my list of things to try. Currently, I am working on adding coroutines to the Hack programming language. My team lead gave a <a href="https://2017.splashcon.org/event/splash-2017-splash-i-towards-ppl-extending-coroutines-in-hack-to-enable-probabilistic-programming">talk on this at SPLASH 2017</a>. Although I did not know that this was going to be the task I would work on when I joined, out of the distribution of possibilities, I think this was the best outcome. There’s certainly uncertainty in the future. But at some level, I think I need to explore higher variance paths right now in life, starting with probabilistic programming. 

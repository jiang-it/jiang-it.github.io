---
layout: default
title:  "Expert Systems Strategies and Datalog"
date:   2015-12-10

type:   Project
categories: expert-systems datalog
---
UNFINISHED

## Expert System Strategies Using Datalog Program Analysis
##### Coauthor: Kevin

### Abstract

Expert systems are computer systems designed to solve domain problems in the manner that a domain expert would. These expert systems may query users for facts to help prove the goal, and such systems employ various strategies to determine the order of questions to ask users. Unfortunately, some naive strategies ask unnecessary or irrelevant questions to users, which negatively impacts users' experiences and reduces the usefulness of these systems. Other systems rely on metarules to inform their question-asking strategies, but these metarules are troublesome to encode and subject to human opinion and error.

This paper describes a domain independent method of automatically generating strategies using program analysis on the encoding of the logic rules. Through the use of heuristics, this method can be used to more easily determine a question-asking strategy that minimizes user-cost. 

An implementation of the methods contained here gives preliminary, but encouraging results, for the feasibility and practicality of deriving control flow strategy in this manner.

### Introduction


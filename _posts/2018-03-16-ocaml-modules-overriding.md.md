---
layout: default
title:  "Overriding OCaml submodules"
date:   2018-03-16

type:   Note
categories: ocaml modules
extfooter: 
  http://gallium.inria.fr/blog/overriding-submodules/ : Related, but slightly more convoluted of a module overriding situation
---

I was recently tasked at work to functorize part of the Hack ecosystem and I ran into a learning opportunity regarding extending and overriding modules in OCaml. Unfortunately, I was unable to find the solution through a google search, perhaps in part because I do not know what to enter as search terms. After a nontrivial amount of time, I found something that, in hindsight, should have been relatively straightforward. Because it was not, I've decided just to make a note of the problem and the route I took to find the solution. 

The problem arose trying to functorize a particular component of the Hack pipeline. Hack has four different notions of the Hack syntax that one might conceptualize like nesting dolls, where each one contains the former but has some extra information. For instance, we have a minimal version of the syntax and we also a positioned version of the system, which is mostly the same as the minimal version of the syntax except it contains information about the original file position of each of the tokens of the syntax. Each of these implement the same module signature. 

{% highlight ocaml %}
module type Syntax_signature = sig
  module Token : Token_signature (* the source of my troubles *)
  type node
  type syntax =
  | Token of Token.t
  | ClassDeclaration of 
    { name : node
    ; body : node
    ...
    }
  | ...
  val text_of : node -> string
  ...
end
{% endhighlight %}

The fact that all of these syntaxes implement the same module signature is wonderful because it allows us to create a bunch of functors that do not have to worry about the type of syntax that it is working with. If I write a module that is meant to transform this syntax, it can simply be a functor over the Syntax_signature and work for all four syntaxes, as well as any additional syntaxes we create without problem as long as the interface is clear. However, the functor I was trying to write would and could only work with Syntax modules that contained positional information. Thus, the Minimal_syntax module would not qualify. So I went ahead and implemented a new signature that would capture the entire interface exposed by the Syntax_signature module signature and expose some more methods. Extending a module in OCaml is quite straightforward.

{% highlight ocaml %}
module type Positioned_syntax_signature = sig
  include Syntax_signature
  val position_of : node -> string
  ...
end
{% endhighlight %}

This was all fine and dandy until I realized that my new functor that would operate over syntax modules with the Positioned_syntax_signature signature also needed to use a more specific version of the Token submodule. It turns out that the Hack ecosystem also has four different corresponding notions of the token module. And I needed to use the token modules that contained position information. So I needed to create a corresponding Positioned_token_signature interface, which I did without much trouble. What I needed to do was somehow override the included Token module from Syntax_signature to be Positioned_token_signature. So I tried the following:

{% highlight ocaml %}
module type Positioned_syntax_signature = sig
  include Syntax_signature
  module Token : Positioned_token_signature
  val position_of : node -> string
  ...
end
{% endhighlight %}

Which promptly threw the following error: `Multiple definitions of the module name Token. Names must be unique in a given structure or signature.` This was odd to me. you could overwrite a module's implementation of a function by doing this. But for some reason, OCaml does not allow me to do the same. So I tried to do the following:

{% highlight ocaml %}
module type Positioned_syntax_signature = sig
  include Syntax_signature with module Token := Positioned_token_signature
  val position_of : node -> string
  ...
end
{% endhighlight %}

But this syntax is not correct. In order to override a module in OCaml, it is required that the right hand side of the `:=` operator is an actualized module. I did not want to do the following:

{% highlight ocaml %}
module type Positioned_syntax_signature = sig
  include Syntax_signature with module Token := Positioned_token_module
  val position_of : node -> string
  ...
end
{% endhighlight %}

Because I do not think this does what I want it to do. In the end, what I found to work is a combination of the three approaches. First declare the submodule instead of declaring it after including the "parent" module. Then use module overriding with the module. 

{% highlight ocaml %}
module type Positioned_syntax_signature = sig
  module Token : Positioned_token_signature
  include Syntax_signature with module Token := Token
  val position_of : node -> string
  ...
end
{% endhighlight %}

Which I think turns out well! That was my little adventure in messing around with OCaml modules and I think I understand the module system a little better as a result!



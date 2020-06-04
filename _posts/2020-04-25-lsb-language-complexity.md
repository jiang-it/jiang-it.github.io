---
layout: default
title:  "LSB: A Case Study of Language Feature Complexity"
date:   2020-04-25

type:   Writing 
categories: programming language design
---

The Hack team receives frequent feature requests. Many features do not make their way into the language for many reasons. Perhaps the utility of the feature is too niche or perhaps the feature cannot be implemented without drastic architecture changes. The bar any new language feature must pass is not low. One of the forces that keeps the bar high is language complexity. There are many desirable reasons to keep the complexity of a language low, and each new feature of a programming language can pose the risk of adding significant language complexity. 

Late static bindings, a feature that Hack inherited from PHP (5.3.0), is a good demonstration of an ancillary feature accompanied by additional language complexity. 

## What is late static binding

Let's say that you have a base class with some static methods.

```php
class BaseClass {
  public static function print_name(): void {
    print "BaseClass\n";
  }

  public static function additional_info(): void {
    print "No additional info\n";
  }

  public static function print_info(): void {
    BaseClass::print_name();
    BaseClass::additional_info();
  }
}

BaseClass::print_info();

> BaseClass
> No additional info
```

I can inherit from this class and call the static method again.

```php
final class ChildClass extends BaseClass {}

ChildClass::print_info();

> BaseClass
> No traits
```

Even if I override the `print_name` and `additional_info` methods on the child class, calling the `print_info` method on the child class will still produce the same results.

```php
final class ChildClass extends BaseClass {
  <<__Override>>
  public static function print_name(): void {
    print "ChildClass\n";
  }

  <<__Override>>
  public static function additional_info(): void {
    print "Overrides two static methods\n";
  }
}

ChildClass::print_info();

> BaseClass
> No traits
```

I could additionally override the `print_info` method on the child class to achieve the desired result.

```php
final class ChildClass extends BaseCla
  <<__Override>>
  public static function print_name(): void {
    print "ChildClass\n";
  }

  <<__Override>>
  public static function additional_info(): void {
    print "Overrides all static methods\n";
  }

  <<__Override>>
  public static function print_info(): void {
    ChildClass::print_name();
    ChildClass::additional_info();
  }
}

ChildClass::print_info();

> ChildClass
> Overrides all static methods
```

Late static bindings allow the programmer to avoid rewriting the `print_info` method by using the `static` syntax.

```php
class BaseClass {
  public static function print_name(): void {
    print "BaseClass\n";
  }

  public static function additional_info(): void {
    print "No additional info\n";
  }

  /* I can make this method final now */
  final public static function print_info(): void {
    static::print_name();
    static::additional_info();
  }
}


final class ChildClass extends BaseClass
  <<__Override>>
  public static function print_name(): void {
    print "ChildClass\n";
  }

  <<__Override>>
  public static function additional_info(): void {
    print "Overrides two static methods\n";
  }
}

BaseClass::print_info();

> BaseClass
> No additional info

ChildClass::print_info();

> ChildClass
> Overrides two static methods
```

The `print_info` method is now "calling context" aware. If I call the static method by invoking it from the base class via `BaseClass::print_info()`, `static` resolves to `BaseClass`. The calling context is `BaseClass`. If I call the static method by invoking it from the child class via `ChildClass::print_info()`, `static` resolves to `ChildClass` without me having to reimplement the function. In this case, the calling context within the `print_info` method is `ChildClass`. 

This feature is actually relatively rare among programming languages. Neither Java or C# have this feature because they do not even allow overriding of static methods the way that PHP does.

In addition to `static`, there are two other special keywords that can interact with the "calling context", `self` and `parent`. At face value, these are shorthand for the name of the current class and the name of the parent class, respectively. 

```php
class ChildClass extends BaseClass {
  <<__Override>>
  public static function print_name(): void {
    print "ChildClass\n";
  }

  <<__Override>>
  public static function additional_info(): void {
    echo "Overrides two static methods\n";
  }

  public static function parent_info(): void {
    parent::print_info();
  }

  public static function base_class_info(): void {
    BaseClass:print_info();
  }

  public static function self_info(): void {
    self::print_info();
  }

  public static function child_class_info(): void {
    ChildClass::print_info();
  }

}
```

It might appear that `parent_info` and `base_class_info` would behave identically. Similarly, it might appear that `self_info` and `child_class_info` would behave identically. However, this is not the case. Using `parent::` and `self::` forwards along the calling context. 

Let's take `ChildClass::parent_info()` and `ChildClass::base_class_info`. The execution of `ChildClass::parent_info()` would go like this:

```php
ChildClass::parent_info(); // calling context: ChildClass

// parent::print_info() resolves to BaseClass:print_info and forwards the calling context along
BaseClass::print_info(); // calling context: ChildClass

// static will resolve to ChildClass
ChildClass::print_name(); // calling context: ChildClass
ChildClass::additional_info(); // calling context: ChildClass
```

The execution of `ChildClass::base_class_info()` would go:

```php
ChildClass::base_class_info(); // calling context: ChildClass

BaseClass::print_info(); // calling context: BaseClass

// Invoking BaseClass::print_info directly will not forward the calling context, so static will resolve to BaseClass
BaseClass::print_name(); // calling context: BaseClass
BaseClass::additional_info(); // calling context: BaseClass
```

Similarly, `self::` would forward along the calling context while calling the class name directly `ChildClass::` would not. 

Together, `self`, `static`, and `parent` already present significant complexity. Yet, this feature has even more interesting implications when discussed in conjunction with other features in Hack.

## Feature Interactions

### __Memoize

The current (as of writing) interaction between __Memoize and late static binding is an example of two features that, when combined, results in unintuitive behavior. 

[Hack has the ability to memoize a function.](https://docs.hhvm.com/hack/attributes/predefined-attributes#__memoize)

Unfortunately, the interaction between late static bindings and memoize is not intuitive. As it is currently implemented, __Memoize does not capture the late static binding. `self::` and `static::` both simply resolve to the class name. Luckily, Hack provides the `__MemoizeLSB` attribute to correctly memoize the calling class context. but even if `__Memoize` and late static bindings were to interact as expected and capture the calling context, this would still function as an effective example of the complexity of interaction between two language features. Whomever implemented the latter feature had to know and account for the complexities presented by the first.

### `self` as a type

In an effort to keep the number of keywords a language uses to a minimum, sometimes syntax and keywords are reused in different contexts. `self` is one such example. In Hack, it is possible to use `self` in places where it is not necessary to think about the class calling context. 

For instance, Hack allows the use of `self` to access type constants, which can be used to denote a method's return type.

```php
final class TypeConstantExample {
  const type T = string;

  public function example(): self::T { 
    return "Hello world!\n";
  }
}
```

One can also use `self::class` to get the name of the current class, as if accessing a static variable on the class. In both of these scenarios, it is exactly the same to use the class's name (if accessible) directly.

But there are two areas of confusion for users. Some are confused as to why Hack's typechecker does not allow you to use `self` directly as a type to return.

```php
final class ReturnExample {
  public function return_self(): self { // Actually an error
    return new ReturnExample();
  }
}
```

It is easy to see where the confusion lies. After all, there are two scenarios where `self` functions exactly like the class name. But at the same time, allowing `self` to function completely like a shorthand for the class name simply serves to obscure the fact that when using `self::` to call a static method, it actually has very different semantic meaning from using the class name directly, as demonstrated above.

By reusing `self` in features where the calling class context is not important, the complexity of the language grows in a way that affects a user's understanding and expectations of the language and those features.

### Function Pointers

Finally, let's examine a feature interaction that occurs if we were to add an additional feature to Hack. Currently, neither Hack nor PHP have first class function pointers. But let's imagine we were designing the feature. In order to get a function pointer to a method or a function, let's simply leave off the parentheses that indicate that it is a method invocation. 

```php
final class MyExample {
  public static function example_method(): void {
    print "Hello World\n";
  }
}

// Gets a function pointer
$x = MyExample::example_method;

$x();

> Hello World 

$x();

> Hello World
```

On its own, function pointers seem like a relatively simple feature. But what about the following?

```php
class MyExample {
  public static function foo(): void {
    print "Will a child class override me?\n";
  }

  public static function bar(): void {
    static::foo();
  }

  public static function function_pointer_example(): void {
    $x = self::foo;
    $x();
  }
}

final class ChildExample {
  <<__Override>>
  public static function foo(): voi {
    print "I overrode the base method\n";
  }
}

ChildExample::function_pointer_example();
```

Does `self::foo` capture the class calling context or not? What is correct here? What would people expect, given that the language also has `self::class`? Is it even legal to capture `self::foo`? Why or why not? If it isn't legal, why is `self::class` legal? 

In this feature interaction, we demonstrate that even a relatively simple concept in function pointers, may still have corners of design complexity where the questions, though there may be no "right" answer, are still difficult to answer.

## Overall

Of note in this examination of late static bindings is that the complexity of the feature is not inherently in the feature itself. By itself, reasoning about any single feature is manageable. It is in the interaction of late static bindings and other features where the complexity emerges. Additionally, for each of the other language features mentioned, `this`, function pointers, and `__Memoize`, they too have additional complexity found in their interactions with other features not mentioned here. 

Another important aspect of this discussion is the temporal aspect. Adding a feature to small language can be easier because there are fewer interacting features to account for. However, each additional feature added has now contributed to the potential complexity of the next feature. And it can be hard to predict what new features will want to be added to the language. After all, the decision to allow overriding of static methods culminated in late static bindings, and the decision to allow late static bindings allowed `static::class` and other features.

Still, as evidenced by the addition of new features, languages can be changed to fit the needs of programmers and learn from previous missteps. 

---
layout: default
title:  "Interesting Off by One Bugs"
date:   2020-09-01

type:   Note
categories: ocaml rust memory bug 
---

I investigated a memory bug in Hack's code that brought me back to school and fiddling with pointers. But interestingly, more than just being a bug where we get tripped up by pointer arithmetic, this bug also only caused us major problems on weekends.

## Some Background

Currently, as of writing this, the Hack toolchain is a combination of Rust and OCaml code. As a result, data structures need to be able to be shared between the two languages. In order to achieve this, we use some C code to allocate OCaml data structures from Rust. Conveniently, the code in question that is supposed to handle this is self contained in a single file, [`ocamlpool.c`](https://github.com/facebook/hhvm/blob/a3fda6c729251a0c214cc360f75d7a8fb97a3da5/hphp/hack/src/utils/ocamlpool/ocamlpool.c).

At a high level, it is a straightforward block allocator. The allocator will first allocate a large block of memory to use. Let's say that I allocate 4096 bytes to use as my block, which I'll draw here. 

```
0x00000000
...
... My Block
...
0x00001000
```

Then, let's say that Rust asks for 256 bytes. Since we have this whole block to use, we can take 256 bytes from this block and give it to Rust. In the scheme listed here, we take these bytes from the end of the block, so it looks like:

```
0x00000000
...
... My Block
... 
0x00000f00
... Given to Rust
0x00001000
```

Note: Rather than allocating a huge block and then dividing it, we could, alternatively, allocate exactly what Rust needs. The disadvantage to this is that allocations of memory are slow, so we want to reduce the number of these that we do. 

So we keep taking slices of this block and giving them to Rust until we no longer have enough memory to satisfy a request from Rust. So let's say that Rust asks us for 512 bytes next. We can just take the next 512 bytes and give them to Rust.

```
0x00000000
...
... My Block
...
0x00000d00
... Given to Rust (512 bytes)
0x00000f00
... Given to Rust (256 bytes)
0x00001000
```

When we run out of space in this block, we can then repeat this process. We would allocate another large block and divide this and give the divisions to Rust.

This is a pretty straightforward scheme. We just need to keep track of a couple of limits. We need to keep track of our bounds and we need to keep track of where we left off. The code uses the terms, `root`, `pointer`, and `bound` for these markers. 

```
0x00000000 [root]
...
... My Block
...
0x00000f00 [pointer]
... Given to Rust (512 bytes)
0x00000f00
... Given to Rust (256 bytes)
0x00001000 [bound]
```

## Headers

There is a complicating details to all of this that makes the bookkeeping a little more difficult. When you allocate an object in OCaml, OCaml uses a bit of memory as a header, to keep track of some metadata about the object. So let's say that I have 16 bytes of data that I want to store as an OCaml object. OCaml will actually use 24 bytes to store that object. It uses 8 bytes for the header and lets me store 16 bytes. OCaml headers, at least on the machines that I am uses, are 8 bytes large. 

So this presents some additional bookkeeping for us because when I allocate 4096 bytes of memory, 8 of those bytes are actually used for a header. So I actually only have 4088 bytes to actually give to Rust.

```
0x00000000 [root]
... OCaml header
0x00000008 [limit]
...
... My Block
...
0x00000d00 [pointer]
... Given to Rust (512 bytes)
0x00000f00 
... Given to Rust (256 bytes)
0x00001000 [bound]
```

I need to make sure I don't stomp over those first 8 bytes. So I need to do some additional bookkeeping. Unfortunately, we don't do this bookkeeping correctly, but we'll get to this later.

But this isn't the only aspect where these 8 bytes for OCaml headers causes extra complications. Since we are allocating OCaml objects from Rust, we also need to attach a header to each object allocated from Rust. This means that when Rust asks us for 512 bytes, we actually need to reserve 520 bytes because 8 bytes are needed for the header. So now our picture would look like this:

```
0x00000000 [root]
... OCaml header
0x00000008 [limit]
...
... My Block
...
0x00000cf0 [pointer]
... Rust header
0x00000cf8 
... Given to Rust (512 bytes)
0x00000ef8
... Rust header
0x00000f00 
... Given to Rust (256 bytes)
0x00001000 [bound]
```

## Off by one

The issue occurs when the object rust wants to allocate is larger than the default large block size. In the example, if Rust asks us for 512 bytes and we don't have room for it, we simply allocate a default block of 4096 bytes. However, what happens if Rust asks us for 4097 bytes? Well, we should ask OCaml for at least 4097 + 8 bytes (for OCaml's header) + 8 bytes (for Rust's header). Instead, we only ask for 4097 + 8 bytes (for Rust's header). We've forgotten to account for OCaml's header. We can't give Rust the memory it needs, and as a result, we crash. 

But there's one additional off by one error. It turns out that we have been doing our bookkeeping wrong as well. In the diagrams above, we've set our [limit] at [root] + 8 bytes to account for the OCaml header. However, in our code, we actually do this accounting twice. We do this in two places, which makes it a little harder to spot. But we do have the following:

```
ocamlpool_limit = (value*)ocamlpool_root + 1;
```

when previously we had already updated the root. 

```
ocamlpool_root = (value)((value*)block + 1);
```

So now we have a diagram that actually looks like this:

```
0x00000000 
... OCaml header
0x00000008 [root]
... Actually empty space
0x00000010 [limit]
...
... My Block
...
0x00000cf0 [pointer]
... Rust header
0x00000cf8 
... Given to Rust (512 bytes)
0x00000ef8
... Rust header
0x00000f00 
... Given to Rust (256 bytes)
0x00001000 [bound]
```

So now this issue makes us believe that we have 8 fewer bytes to allocate than we actually do. This one also doesn't affect us regularly because normally, if we think we don't have enough memory, we simply just allocate a new block. But as we've discussed, this issue affects us as soon as Rust asks us for more than the default size of block.

## Why did it take so long to find this issue?  

Amazingly, these two bugs lived in our code for months. Did these issues cause bugs in production? Well yes, sometimes. In fact, the only reason why this issue was found and debugged was because we blocked push. But we went months without causing a severe enough issue that forced us to fix it. Why was that? 

Well, part of the problem was that this scenario just didn't occur very frequently. Our default block size was 2^20 bytes - or a megabyte. For Rust to ask us to allocate a contiguous megabyte would require someone to write a Hack file with a really long string or symbol. A million characters long. And most files aren't a million characters, let alone contain a single string or symbol that is a million characters long. 

But once someone did write a file containing a string with a million character string or symbol, wouldn't we always trip over this bug? Not necessarily, because it turns out that there's something a bit random going on under the hood here. When Rust asks us for 2 million bytes, we ask OCaml for 2 million and one bytes. But OCaml doesn't always give us 2 million and one bytes. OCaml sometimes gives us more than that. This is because we use the following malloc call: `caml_alloc_for_heap`. 

If we take a look at the [source code](https://github.com/lucasaiu/ocaml/blob/master/byterun/memory.c) for that:

```
mem = caml_aligned_malloc (request + sizeof (heap_chunk_head),
    sizeof (heap_chunk_head), &block);
```

And if we take a look at the [source code](https://www.cl.cam.ac.uk/~pes20/hashcaml/hashcaml-current/byterun/misc.c) for that:

```
char *caml_aligned_malloc (asize_t size, int modulo, void **block) {
  char *raw_mem;   
  uintnat aligned_mem;
  Assert (modulo < Page_size);
  raw_mem = (char *) malloc (size + Page_size);
  if (raw_mem == NULL) return NULL;
  *block = raw_mem;
  raw_mem += modulo; /* Address to be aligned */
  aligned_mem = (((uintnat) raw_mem / Page_size + 1) * Page_size); 
#ifdef DEBUG
  {
    uintnat *p;
    uintnat *p0 = (void *) *block, 
            *p1 = (void *) (aligned_mem - modulo),
            *p2 = (void *) (aligned_mem - modulo + size),
            *p3 = (void *) ((char *) *block + size + Page_size);
    
    for (p = p0; p < p1; p++) *p = Debug_filler_align;
    for (p = p1; p < p2; p++) *p = Debug_uninit_align;
    for (p = p2; p < p3; p++) *p = Debug_filler_align;
  } 
#endif
  return (char *) (aligned_mem - modulo); }
```

OCaml actually attempts to align the memory to a page for us. So only sometimes will OCaml give us back exactly the size that we asked for. The remaining times, it will actually page align the memory and then give us more memory back than we asked for. 

Combining these characteristics that make this bug rare, why did this bug only seem to get triggered for us on weekends? Well, we actually do have a Hack file that contains a string of more than one million characters. Like any monstrosity, the file is actually autogenerated for each release, with that string growing larger and larger each time it is generated. So we actually hit the aforementioned error very frequently. But we don't notice it very often. This is because when we release and something breaks, we often just skip that release. We combine new changes in the repository and regenerate the file and attempt a new release. This regeneration changes the amount of memory that Rust asks for us for the string in question and OCaml will oftentimes give us more memory than we ask for, due to the page alignment issue. So, the new release works. 

On weekends, however, the number of changes hitting the repo falls drastically. As a result, when a release fails, the next attempted release may not get any new changes. The autogenerated file will not change and the new release attempt will also fail. As a result, the Hack team gets pinged because instead of one release failing every so often, multiple consecutive releases are failing. 

And so goes the tale of a memory bug that occurs on weekends. The next public release of Hack should have the fixes I've detailed here. 

Thanks to [@shiqicao](https://github.com/shiqicao) for the help debugging this issue.

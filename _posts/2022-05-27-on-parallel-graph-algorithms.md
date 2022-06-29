---
layout: post
title: "Deep Dive: On Parallel graph algorithms"
author: Nimalan
tags: graph algo cuda
excerpt_separator: <!--more-->
---

Traditional graph traversal algorithms DFS and BFS are recursive. There are iterative versions as well but our next question would be on how to scale these to multiple CPU cores, or across muliple GPU cores. This deep dive is to explore parallel graph algorithms and on what type of hardware they would shine

<!--more-->

## Parallel BFS

In a parallel BFS we create a list of all the nodes in the layer, then we distribute this to threads for processing, a barrier is needed after between layers in the graph to ensure consistency.

A small psuedo code of this would be as follows. This wouldn't be the best way of doing this in parallel, the example is for representation purposes

```c
void bfs_parallel(source s) {
  Curr_Nodes = {}
  Next_Nodes = {}

  push(s, Curr_Nodes)

  #pragma omp parallel shared(Curr_Nodes, Next_Nodes)
  {

    while (Curr_Nodes !empty) {

      #pragma omp for
      for (node : Curr_Nodes) {

        // Add neighbours for next level
        for (v : u.neighbour()) {
          #pragma omp critical
          {
            push(v, Next_Nodes)
          }
        }

        process(node)
      }

      #pragma omp barrier

      #pragma omp master
      {
        Current_Nodes = Next_Nodes;
        Next_Nodes = {};
        level += 1;
      }

      #pragma omp barrier
    }
  }
}
```

This idea runs into some problems

1. This cannot be used for algorithms where the order is important like range based algorithms.
2. The amount of workload received by the threads will change in different layers of the graph.
3. Synchronization between layers would mean that we need to have a decent number of nodes in a layer to actually benefit from parallelism
4. Data locality is a challenge 
  + If we were in a distributed system it would mean that the data has to be transferred to the remote system adding communication challenges
  + If we were using a multicore / threading data being in the same cache line would be a challenge

> **Note:** On a distributed system an alternative way is to partition the graph across nodes

## Graph algorithms in the GPU

A recursive BFS would perform very badly on the GPU. If we were to use an iterative approach we would run into the problem of thread divergence. GPUs have SIMT architecture, where we would get max performance if all the threads in a thread warp execute the same instruction. A relatively simple GPU kernel without a lot of conditions would have the best performance.

There is a case study from Nvidia's Technical Blog [Tree Traversal on GPU](https://developer.nvidia.com/blog/thinking-parallel-part-ii-tree-traversal-gpu/) on graph traversal in which they assign one thread per leaf node in a BVH and threads will process objects that are nearby in 3D space.

## References

1. Wikipedia. Parallel breadth-first search. URL [https://en.wikipedia.org/wiki/Parallel_breadth-first_search](https://en.wikipedia.org/wiki/Parallel_breadth-first_search)

2. Tero Karras. Thinking Parallel, Part 2: Tree Traversal on GPU. Nvidia Technical Blog . URL [https://developer.nvidia.com/blog/thinking-parallel-part-ii-tree-traversal-gpu/](https://developer.nvidia.com/blog/thinking-parallel-part-ii-tree-traversal-gpu/)

3. Tero Karras. Thinking Parallel, Part 3: Tree Construction on GPU. Nvidia Technical Blog . URL [https://developer.nvidia.com/blog/thinking-parallel-part-iii-tree-construction-gpu/](https://developer.nvidia.com/blog/thinking-parallel-part-iii-tree-construction-gpu/)


---
layout: post
title: "Case study on extended statistics"
author: Nimalan
tags: postgres performance
---

# Case study on extended statistics

First we need to ask ourselves the following questions

- What are statistics in Postgresql?
  + When we do a query the planner will need to estimate the number of rows to
  retrieve from the table. To do this infomation is stored in the table `pg_statistic`
  + Entries here are updated by `ANALYSE` and are always kept up to date, in
  the example I would be showing a case where that occurs
  + The statistics stored however are for a single column
- What is an extended statistics?
  + An extended statistics is something an user can create
  + This is used in cases when queries are slow due to correlation between columns

---

## Example

Consider the following tables

```sql
SET max_parallel_workers_per_gather = 0;
create table t1 (
  a int,
  b int
);
insert into t1 select i/1000, i/500 from generate_series(1, 1000000) s(i);
```

Things to note
- Data of column a and b have correlation between each other

---

## Without parallel queries enabled

Now let's start with a clean table

```sql
nimalanm@/tmp:test> ANALYZE t1;
ANALYZE
Time: 0.064s
nimalanm@/tmp:test> explain analyse select * from t1 where a = 0 and b = 1;
+---------------------------------------------------------------------------------------------------+
| QUERY PLAN                                                                                        |
|---------------------------------------------------------------------------------------------------|
| Seq Scan on t1  (cost=0.00..19425.75 rows=25 width=8) (actual time=0.015..82.493 rows=50 loops=1) |
|   Filter: ((a = 0) AND (b = 1))                                                                   |
|   Rows Removed by Filter: 999950                                                                  |
| Planning Time: 0.037 ms                                                                           |
| Execution Time: 82.507 ms                                                                         |
+---------------------------------------------------------------------------------------------------+
EXPLAIN
Time: 0.094s
```

Now let's create a `STATISTICS` saying that a and b are correlated

```sql
CREATE STATISTICS s1 (dependencies) on a, b from t1;
nimalanm@/tmp:test> explain analyse select * from t1 where a = 0 and b = 1;
+---------------------------------------------------------------------------------------------------+
| QUERY PLAN                                                                                        |
|---------------------------------------------------------------------------------------------------|
| Seq Scan on t1  (cost=0.00..19425.00 rows=50 width=8) (actual time=0.013..70.186 rows=50 loops=1) |
|   Filter: ((a = 0) AND (b = 1))                                                                   |
|   Rows Removed by Filter: 999950                                                                  |
| Planning Time: 0.078 ms                                                                           |
| Execution Time: 70.200 ms                                                                         |
+---------------------------------------------------------------------------------------------------+
EXPLAIN
Time: 0.083s
```

The estimate made by the optimizer is much close to the actual cost, there is a minor increase in performance.
I couldn't find a case which would give me a great performance difference though

---

## With parallel queries enabled

Initially I didn't disable parallel workers. I've used Postgres 12 so we seem to get a 
`parallel seq scan`, which was `2x` faster than hence messed with my benchmark

```sql
nimalanm@/tmp:test> explain analyse select * from t1 where a = 0 and b = 1;
+------------------------------------------------------------------------------------------------------------------+
| QUERY PLAN                                                                                                       |
|------------------------------------------------------------------------------------------------------------------|
| Gather  (cost=1000.00..11675.10 rows=1 width=8) (actual time=0.202..44.202 rows=50 loops=1)                      |
|   Workers Planned: 2                                                                                             |
|   Workers Launched: 2                                                                                            |
|   ->  Parallel Seq Scan on t1  (cost=0.00..10675.00 rows=1 width=8) (actual time=14.889..29.008 rows=17 loops=3) |
|         Filter: ((a = 0) AND (b = 1))                                                                            |
|         Rows Removed by Filter: 333317                                                                           |
| Planning Time: 0.110 ms                                                                                          |
| Execution Time: 44.223 ms                                                                                        |
+------------------------------------------------------------------------------------------------------------------+
EXPLAIN
Time: 0.060s

nimalanm@/tmp:test> CREATE STATISTICS s1 (dependencies) on a, b from t1;
CREATE STATISTICS
Time: 0.005s

nimalanm@/tmp:test> analyse;
ANALYZE
Time: 0.108s

nimalanm@/tmp:test> explain analyse select * from t1 where a = 0 and b = 1;
+-------------------------------------------------------------------------------------------------------------------+
| QUERY PLAN                                                                                                        |
|-------------------------------------------------------------------------------------------------------------------|
| Gather  (cost=1000.00..11680.00 rows=50 width=8) (actual time=0.157..43.423 rows=50 loops=1)                      |
|   Workers Planned: 2                                                                                              |
|   Workers Launched: 2                                                                                             |
|   ->  Parallel Seq Scan on t1  (cost=0.00..10675.00 rows=21 width=8) (actual time=14.645..28.308 rows=17 loops=3) |
|         Filter: ((a = 0) AND (b = 1))                                                                             |
|         Rows Removed by Filter: 333317                                                                            |
| Planning Time: 0.162 ms                                                                                           |
| Execution Time: 43.446 ms                                                                                         |
+-------------------------------------------------------------------------------------------------------------------+
EXPLAIN
Time: 0.059s
```

---

## Footnotes

Why is this just not about `extended statistics` and why is this case study also about `indexes`?

When we generally encounter a performance problem our general instinct is to create
a query on the column; which is effective, but adding more and more indexes
would cause the table to be reindexed for each write. If in the case the
columns are correlated, we could use `extended statistics` without comprimising the write.

This is the performance without index

```sql
nimalanm@/tmp:test> insert into t1 select i/1000, i/500 from generate_series(1, 1000000) s(i);
INSERT 0 1000000
Time: 1.300s (a second), executed in: 1.300s (a second)

nimalanm@/tmp:test> drop table t1;

nimalanm@/tmp:test> create table t1 (
   a int,
   b int
 );
 insert into t1 select i/1000, i/500 from generate_series(1, 1000000) s(i);
CREATE TABLE
INSERT 0 1000000
Time: 1.368s (a second), executed in: 1.368s (a second)

nimalanm@/tmp:test> create index on t1 (a);
CREATE INDEX
Time: 0.645s

nimalanm@/tmp:test> explain analyse select * from t1 where a = 0 and b = 1;
+-----------------------------------------------------------------------------------------------------------------------+
| QUERY PLAN                                                                                                            |
|-----------------------------------------------------------------------------------------------------------------------|
| Bitmap Heap Scan on t1  (cost=93.93..4804.31 rows=25 width=8) (actual time=0.129..0.198 rows=500 loops=1)             |
|   Recheck Cond: (a = 0)                                                                                               |
|   Filter: (b = 1)                                                                                                     |
|   Rows Removed by Filter: 499                                                                                         |
|   Heap Blocks: exact=5                                                                                                |
|   ->  Bitmap Index Scan on t1_a_idx  (cost=0.00..93.92 rows=5000 width=0) (actual time=0.067..0.067 rows=999 loops=1) |
|         Index Cond: (a = 0)                                                                                           |
| Planning Time: 2.203 ms                                                                                               |
| Execution Time: 0.269 ms                                                                                              |
+-----------------------------------------------------------------------------------------------------------------------+
EXPLAIN
Time: 0.020s

nimalanm@/tmp:test> insert into t1 select i/1000, i/500 from generate_series(1, 1000000) s(i);
INSERT 0 1000000
Time: 3.211s (3 seconds), executed in: 3.211s (3 seconds)
```

Index is way faster in this case, but as you can see the write performance has increased `2x`.
I don't feel this is an accurate comparison as it is a `bitmap heap scan` vs `seq scan`

### References

- https://www.postgresql.org/docs/12/multivariate-statistics-examples.html

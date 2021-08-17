---
layout: post
title: "Perf Scripts"
author: Nimalan
tags: perf optimization hpc
excerpt_separator: <!--more-->
---

`perf` is a Performance analysis tools for Linux. `perf` can be used to provide useful statistics about your application with `perf stat <app>` or sampled and analysed with `perf record <app>`. When recording with perf we are left with a binary file `perf.data` which contains information of the all sampled events.

Events from `perf.data` can be extracted and scripted on with `perf script`. There is very limited documentation and examples of `perf script`, so I'm going to be walking through the exploration I did with `perf script`. For this I'll be using a `perf.data` generated from an execution of an albeian sandpile model program.

<!--more-->

## Dump events from perf.data

First let's understand what data can be extracted from `perf.data`. Running `perf script` will output events from `perf.data`

```sh
perf record
# Walk through perf file and output contents of each record
perf script > out.perf
```

```
        sandpile  1751 13289.335292:   10101010 cpu-clock:uhH:      559a3f21248b Fractal::Sandpile::stabilize+0x24b (/home/bench/sandpile)
```

What each field means

```
comm - sandpile
tid - 1751
event - cpu-clock:uhpppH
ip - 559a3f21248b
sym - Fractal::Sandpile::stabilize
symoff - +0x24b
time - 13289.335292
dso - (/home/bench/sandpile)
```

If perf was recorded with `-g`, the output contains trace like this

```sh
perf record -g
perf script > out.perf

sandpile   131 11005.728397:   10101010 cpu-clock:uhH: 
	    560cdca6739a Fractal::Sandpile::stabilize+0x15a (/home/bench/sandpile)
	    560cdca67984 Fractal::Sandpile::computeIdentity+0x84 (/home/bench/sandpile)
	    560cdca670ef main+0x1f (/home/bench/sandpile)
	    7f36527fd09b __libc_start_main+0xeb (/lib/x86_64-linux-gnu/libc-2.28.so)
	41fd89415541f689 [unknown] ([unknown])
```

If we want to extracting a custom set of fields from perf events

```
perf script -F  comm,tid,event,ip,sym,srcline,time > out.perf

        sandpile  1751 13289.335292: cpu-clock:uhH:      559a3f21248b Fractal::Sandpile::stabilize
  sandpile.cc:72
        sandpile  1751 13289.345516: cpu-clock:uhH:      559a3f212494 Fractal::Sandpile::stabilize
  sandpile.cc:72

# Add extra field
perf script -F+srcline > out.perf

        sandpile  1751 13289.335292:   10101010 cpu-clock:uhH:      559a3f21248b Fractal::Sandpile::stabilize+0x24b (/home/bench/sandpile)
  sandpile.cc:72
        sandpile  1751 13289.345516:   10101010 cpu-clock:uhH:      559a3f212494 Fractal::Sandpile::stabilize+0x254 (/home/bench/sandpile)

# Remove field
perf script -F+srcline -F-period > out.perf

        sandpile  1751 13289.335292: cpu-clock:uhH:      559a3f21248b Fractal::Sandpile::stabilize+0x24b (/home/bench/sandpile)
  sandpile.cc:72
        sandpile  1751 13289.345516: cpu-clock:uhH:      559a3f212494 Fractal::Sandpile::stabilize+0x254 (/home/bench/sandpile)
  sandpile.cc:72

```

List of all events in perf we can extract(this was taken from the man page)

```
Valid types: hw,sw,trace,raw,synth. Fields: comm,tid,pid,time,cpu,event,trace,ip,sym,dso,addr,symoff,srcline,period,iregs,uregs,brstack,brstacksym,flags,bpf-output,brstackinsn,brstackoff,callindent,insn,insnlen,synth,phys_addr,metric,misc
```

## Scripting

There are two ways of scripting the data. You can generate a script from the default template with `perf script -g perl` or `perf script -g python`

Or you can create a custom script, for this example we'll generate a custom script, I'll cover using the generated script in a separate blog

```sh
perf script -F+srcline -F-period -F-time -F-dso -F+sym -F-symoff > out.perf

        sandpile  1751/1751  cpu-clock:uhH:      559a3f21248b Fractal::Sandpile::stabilize
  sandpile.cc:72
```

The structure of the file is constant so scripting this is similar to scripting any file. The following is a script to extract the occurrence of a particular source line number in the samples, giving us an idea on which symbol and line took time

### Case - 1: Identifying a hotspot in the code with source line number and symbol

```pl
#!/usr/bin/env perl
# srcline-occurance.pl <perf output>
# Usage perf script -F+srcline -F-period -F-time -F-dso -F+sym -F-symoff | srcline-occurance.pl
use strict;

my %sym_occurance = ();

while (<>) {
  chomp;
  next if $_ =~ /^#/;

  if (/^\s*(\S.+?)\s+(\d+)\/*(\d+)*\s+/) {
    my ($comm, $pid, $tid) = ($1, $2, $3);
    if (not $tid) {
			$tid = $pid;
			$pid = "?";
		}

    if (/(\S+):\s*(\S+)\s+(\S+)/) {
      my ($event, $ip, $sym) = ($1, $2, $3);

      $_ = <>;
      chomp;
      my $srcline;
      if (/\s+(\S+:\d+)/) {
        $srcline = $1;
      } else {
        $srcline = 'Unknown';
        $sym = '?';
        next;
      }

      if (exists $sym_occurance{$srcline}) {
        $sym_occurance{$srcline}{occ}++;
      } else {
        $sym_occurance{$srcline}{symbol} = $sym;
        $sym_occurance{$srcline}{occ} = 1;
      }
    }
  } else {
    print STDERR "Unknown line";
  }
}

foreach my $k (sort { $a cmp $b } keys %sym_occurance) {
	print "$k $sym_occurance{$k}{symbol} $sym_occurance{$k}{occ}\n";
}
```

```
sandpile.cc:62 Fractal::Sandpile::stabilize 1
sandpile.cc:63 Fractal::Sandpile::stabilize 1
sandpile.cc:64 Fractal::Sandpile::stabilize 5
sandpile.cc:67 Fractal::Sandpile::stabilize 35
sandpile.cc:70 Fractal::Sandpile::stabilize 3
sandpile.cc:71 Fractal::Sandpile::stabilize 2
sandpile.cc:72 Fractal::Sandpile::stabilize 4
sandpile.cc:73 Fractal::Sandpile::stabilize 15
sandpile.cc:75 Fractal::Sandpile::stabilize 3
sandpile.cc:85 Fractal::Sandpile::stabilize 1
```

### Case - 2: Spitting perf.data of a MPI run into separate files for individual processes

```perl
#!/usr/bin/env perl
# split-process.pl <perf output>
# Usage perf script -F+pid | split-process.pl
use strict;

my %files = {};
my $pid = '';
my $comm = '';
my $tid = '';

while (<>) {
  chomp;
  next if $_ =~ /^#/;
  if (/^\s*(\S.+?)\s+(\d+)\/*(\d+)*\s+/) {
    ($pid, $tid) = ($2, $3);
    if (not $tid) {
			$tid = $pid;
			$pid = "?";
		}
  }
  open my $fh, '>>', "out-$pid.perf";
  print $fh $_ . "\n";
}
```

will generate `out-<pid1>.perf`, `out-<pid2>.perf`, `out-<pid3>.perf`

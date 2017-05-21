# Work


## Why

Make lifer easier


## What

Small abstraction layer on top of web worker to 


## How

Provides a way similar to the fetch API to fetch the result of a computation done outside the main thread.
Import this library and read this readme.


results for ping
average rountrip time for korean.net 320ms
average rountrip time for google.com 30ms


## Install

Download `work.js`


## API

the function must be synchronous, to garantee in order receival, but also because of how, the return value is used


## Hope

 * 6+ no effect
 * 5 immediately terminated after use and all the above
 * 0 immediately unregistered/deleted after use and all the above


## Lazy

 * 5+ no effect
 * 4 and all the above
 * 3 and all the above
 * 2 and all the above
 * 1 and all the above
 * 0 and all the above


##Alternatives

https://github.com/andywer/threads.js
https://github.com/padolsey/operative
raw web worker
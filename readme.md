# worka


## Why

Make lifer easier. Working with Web Workers is cool, it makes things previously only available to native apps possible on the web also. Multi threading is hard to get right, and that's why I use patterns to stay correct. Many patterns are duplicated across different applications. These patterns are now internalized into a library to avoid duplication.


## What

Abstraction layer on top of web worker, with declarative life cycle. Encapsulation of useful patterns. Some features:

 * Promised based API
 * Worker auto split into more worker
 * Time out management
 * Opt in statefull worker
 * Lifecycle management


## How

With a script to be imported. [worka.js](./source/worka.js)


## Inspiration

Inspired by the clean stateless HTTP architecture, something comes in, something comes out. Below is an example where you can even race with the network.


### Short Example (source/worka.html)


```
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width">
    </head>
    <body>
        <p>Open console</p>
        <script type="module">
import { registerWorker, SYMBOLS, work } from "./worka.js";

const sort = function (array) {
    array.sort();
    return array;
};

registerWorker({
    name: "sort",
    resource: sort,
    loadMode: SYMBOLS.FUNCTION
});

work("sort", [1, 2, 3, -8, -5, 2, 3, 45, 5]).then(function (result) {
    console.log(result);
});

    </script>
    </body>
</html>

```


## Limitations


Inside web worker: https://nolanlawson.github.io/html5workertest/ .

The functions must be synchronous. Only available as ES module for now. Requires full ES2015 and more support. Requires ES Promises.

Does not support

 * Transferable objects


## Install

Download `source/worka.js`



## API

 * [work](#work)
 * [registerWorker](#registerWorker)
 * [SYMBOLS](#symbols)


### work

`work(name, input);`


Returns a promise that eventually resolves with the result or fails. Use registerWorker first !


```
work("test/sort", [1,2,3,-8,-5,2,3,45,5]).then(function (result) {
    console.log(result);
}).catch(function (reason) {
    if (reason === SYMBOLS.NO_SUPPORT_ERROR) {
        console.log("Web Worker API not supported");
    } else if (reason === SYMBOLS.TIME_OUT_ERROR) {
        // can only happen with a worker registered with a timeOut
        console.log("Took longer than expected");
    } else {
        console.log("Error:", reason);
    }
});
```

#### name (required)


the name of the worker or `${name}/${functionName}`.


#### input


The input that will be provided to the worker. To pass multiple inputs use a container, such as an Array or an Object.


### registerWorker

`registerWorker(options);`


returns undefined. Immediately registers a worker. Registration is required before usage.


#### options (required)


Describes the worker. Example:


```
{
    name: "workerName",
    resource: myFunction,
    loadMode: SYMBOLS.FUNCTION,
    lazy: 5,
    hope: 6,
    max: navigator.hardwareConcurrency || 1,
    stateless: true,
    initialize: false,
    timeOut: false
}
```


#### name (required)


`Symbol` or `String` that uniquely identifies a worker.


#### resource (required)


Any value that can help build the worker. Must be in sync with `loadMode`.


#### loadMode (required)


Possible Values: `SYMBOLS.FUNCTION, SYMBOLS.STRING, SYMBOLS.MULTI_FUNCTION`


Partial Default


```
{
    loadMode: SYMBOLS.STRING
}
```


To use multiple functions inside 1 Worker use `SYMBOLS.MULTI_FUNCTION` and provide as a `resource` a function that returns an object with multiple functions. Individuals keys of the object are later used to activate the targeted function.


```
const returnsMultipleFunctions = function () {

    const sort = function (array) {
        array.sort();
        return array;
    };

    const addNegativeLength = function (array) {
        array.push(-array.length);
        return array;
    };

    return {
        sort,
        addNegativeLength
    };
};

registerWorker({
    name: "test",
    resource: returnsMultipleFunctions,
    loadMode: SYMBOLS.MULTI_FUNCTION
});

work("test/sort", [1,2,3,-8,-5,2,3,45,5]).then(function (result) {
    console.log(result);
});
work("test/addNegativeLength", [1,2,3,-845,5]).then(function (result) {
    console.log(result);
});
```


#### Statefull and Stateless


Partial Default


```
{
    stateless: true
}
```


Pure functions are stateless. Function that change variables other than the return value are statefull (Worker that do not use transferable, have a copy of the input, not the input itself, which means a top level function inside a worker can change the __copied__ input and still be pure). Statefull component will never auto split into multiple workers. Before using statefull workers everywhere, consider moving the state up; moving the state in the main thread, mutate it only there, and providing it to the worker each time alongside the regular input. There is no need to set `initialize`. To provide a statefull function use `stateless: false` and the following format:


```
// Also known as the generator pattern
const statefullGenerator = function () {
    // state declaration and initialization
    // it is encapsulated and not accessible from the outside
    let x = 0;
    return function (input) {
        // function to execute each time, with input
        // can change outer state
        // this function is not pure
        x += input;
        return x;
    };
};

registerWorker({
    name: "stateTest",
    resource: statefullGenerator,
    loadMode: SYMBOLS.FUNCTION,
    stateless: false
});

work("stateTest", 5).then(function (result) {
    console.log(result); // 5
    return work("stateTest", 5);
}).then(function (result) {
    console.log(result); // 10
});
```


#### initialize


To force an initial initialization phase, use `initialize: true` and use the delayed initialization pattern. This is especially useful to create large constant values once only or use recursive functionality.


Partial Default


```
{
    initialize: false
}
```

```

const functionContainer = function () {

    const largeConstantInitialization = ["could be a long array",
        "or something that would be costly to create each time"];
    let recursiveFunction;
    recursiveFunction = function ({input = "", tree}) {
        const localTextContent = tree.textContent;
        const allTextContent = `${input} ${localTextContent}`;
        if (tree.child) {
            return recursiveFunction({input: allTextContent, tree: tree.child});
        }
        return allTextContent;
    }
    return recursiveFunction;
};

registerWorker({
    name: "initializationTest",
    resource: functionContainer,
    loadMode: SYMBOLS.FUNCTION,
    initialize: true
});

const recursiveDataStruct = {
    textContent: "top level",
    child: {
        textContent: "middle level",
        child: {
            textContent: "bottom level",
            child: {
                textContent: "underground",
                child: {
                    textContent: "-10"
                }
            }
        }
    }
};
work("initializationTest", {tree: recursiveDataStruct})
.then(function (result) {
    console.log(result); // 5
});
```


#### Hope


Hope is a number that helps make assumptions about the lifecycle of the worker. A worker with 0 hope is going to be deleted after it is used. A worker with lots of hope is going to be kept after each usage.


Partial Default


```
{
    hope: 6
}
```


 * 6+ no effect default value
 * 5 immediately terminated after each use
 * 1 - 4 place-holders do not use
 * 0 immediately unregistered and deleted after use and all the above. Use this for a 1 time computations only.

5 Use this to free up memory at the expense of slower restart. Do not use if you know the work will be done again.

0 Use this for a 1-time computation only.


#### Lazy


Lazy is a number that helps make assumption about the life cycle of the worker. A worker with 0 lazy is going to be absolutely ready before it is going to be used. A worker with 5 lazy is going to initialize only when needed. The lazy value has an effect on registerWorker only.


Partial Default


```
{
    lazy: 5
}
```

 * 5+ no effect, slowest first start, lowest memory usage
 * 4 worker is preloaded
 * 3 worker is decorated and all the above
 * 2 worker is instanciated and all the above
 * 1 place holder do not use
 * 0 worker is started, and initialization is run and all the above



#### Time out


`false` or a positive integer `Number`


By default there is no time out. The time out timing start just after work(...).then(...). If the operation takes longer the Promise will reject with SYMBOLS.TIME_OUT_ERROR.


Partial Default


```
{
    timeOut: false
}
```


#### max

Integer `Number` equal or above `1`.


By default each registered worker will spawn copies of itself when ever `work()` is called while there is already a worker computing. `max` describes the maximum amount of Web Worker for this registered worker. Do not include this option unless you know exactly why and what you are doing. Statefull worker will not spawn copies of itself by default.


Partial Default


```
{
    max: navigator.hardwareConcurrency || 1
}
```


### SYMBOLS


Object containing constant values used at various places for strict equality comparisons.


## Advanced topics


### Fall back strategy


### Network first

```
const promise = fetch(`../estimatePi?input=${precision}`, {}).then(function (response) {
    return response.text();
}).then(function (resultString) {
    const result = Number(resultString);
    return result;
}).catch(function (noNetwork) {
    return work("getPiEstimation", precision);
});
```


### Worker First

```
const fetchFromNetwork = function (precision) {
    return fetch(`../estimatePi?input=${precision}`, {}).then(function (response) {
        return response.text();
    }).then(function (resultString) {
        const result = Number(resultString);
        return result;
    });
};

const promise = work("getPiEstimation", precision).catch(function (error) {
    if (error === SYMBOLS.NO_SUPPORT_ERROR) {
        return fetchFromNetwork(precision);
    } else {
        throw error;
    }
});

```

### Race

Before using `Promise.race`, read about its limitations.

```
const fetchFromNetwork = function (precision) {
    return fetch(`../estimatePi?input=${precision}`, {}).then(function (response) {
        return response.text();
    }).then(function (resultString) {
        const result = Number(resultString);
        return result;
    });
};

const promise = Promise.race([
    work("getPiEstimation", precision),
    fetchFromNetwork(precision)
]);

```


### Extensions


#### Memoize

Memoize is not included by default for maximum flexibility. It is possible to memoize the resolution value from the worker with an external library like [promise-memoize](https://github.com/nodeca/promise-memoize). Learn about the limitations of memoization first.


```npm install promise-memoize```


```
// imports
const promiseMemoize = require("promise-memoize");
const { registerWorker, work, SYMBOLS} = require("worka"); // require not supported yet


// register worker
registerWorker({
    name: "getPiEstimation",
    resource: estimatePi,
    loadMode: SYMBOLS.FUNCTION
});

// create memoized version
const memoized = promiseMemoize(function(precision) {
    return work("getPiEstimationForceRestart", precision);
});

// use it

memoized(1000).then(...);
memoized(1000).then(...);

// note it is also possible to memoize everything like this
const memoizedWork = promiseMemoize(work);

```


## Alternatives

 * https://github.com/andywer/threads.js
     * Also works for NodeJS
     * Also for non ES6
     * Transferrables
     * More complex
 * https://github.com/padolsey/operative
     * Falls back to using iframes
     * high range of browser support
     * Promise or callback based
 * https://github.com/nolanlawson/promise-worker
     * Small
     * Also promised based
 * raw web worker
     * More freedom but might have to reinvent patterns discovered here



## To Do


 * expose decorate to compile time
 * allow asynchronous function execution
 * report progress system design
 * optimization
 * es5, script, and old browser support
 * provide a version that works out of the box with all Polyfills
 * Opt in for transferable ,maybe with [Atomic operations](https://github.com/tc39/ecmascript_sharedmem/blob/master/TUTORIAL.md)


## About this package

### Some tests

Look at the /example folder

Steps with npm cli:

 * cd example
 * npm install
 * cd ..
 * node example/index.js
 * open http://localhost:3000/example/example.html

There you can compare

 * With preloaded web worker
 * With web worker
 * With web worker, without cache
 * Without web worker
 * With remote server

The results can vary alot and depends, on network condition, ability to run the software in
parallel (often in %), setup time/work time,

Feel free to open issue to know more.

### The name

"worka" was chosen to keep it short and "worker" was already taken.


### License


[Boost License](./LICENSE.txt)
/*work.js*/
/*

other options: timeOut (after how many ms, should we cancel the operation)

auto split (spawn more worker instances)2-4-8-16 auto based on feedback

expose decorate to compile time

navigator.hardwareConcurrency

const URL = window.URL || window.webkitURL;

allow Recursion inside worker

report progress (use Date.now as id, but allow dependency injection when needed)

allow multiple function per worker

handle error strategies validate before sending,

multiple results (wait for aggregation)
multiple results callback

convention pass done function so that setTimeOut works

what really happens after terminate ?

optimisation ideas

remove unused things inside worker, like originalAsString if it is never going to be used again
*/
/*jslint
    es6, maxerr: 50, browser, devel, fudge, maxlen: 100
*/
/*global
    Worker, URL, Blob
*/
"use strict";
const workers = {};

const SYMBOLS = {
    // loadMode
    STRING: "string",
    DECORATED: "decorated",
    FUNCTION: "function",
    FILE: "file",
    DECORATED_FILE: "decoratedFile"
};

const WORKER_DEFAULT_OPTIONS = {
    name: "doSomething",
    ressource: "/js/myWorker.js",
    loadMode: SYMBOLS.STRING,
    lazy: 10,
    hope: 1
};

// separate from WORKER_DEFAULT_OPTIONS, impossible to overwrite with options in registerWorker
const WORKER_INITIAL_SETTINGS = {
    loaded: false,
    originalAsString: "",
    decorated: false,
    decoratedAsString: "",
    instanciated: false,
    workerObjectURL: undefined,
    instance: undefined,
    awakened: false,
    hasEventListener: false,
    resolutionQueue: []
};

const loadWorker = function (worker) {
    const ressource = worker.ressource;
    const loadMode = worker.loadMode;
    if (loadMode === SYMBOLS.FUNCTION) {
        worker.originalAsString = ressource.toString();
    }
    worker.loaded = true;
};

const decorateWorker = function (worker) {
    const originalAsString = worker.originalAsString;
    worker.decoratedAsString = `

"use strict";
const doWork = ${originalAsString};
self.addEventListener("message", function(event) {
    const message = event.data;
    if (!Object.prototype.hasOwnProperty.call(message, "input")) {
        return; // only waking up
    }
    const input = message.input;
    self.postMessage({
        result: doWork(...input)
    });
});

    `;
    worker.decorated = true;
};

const instanciateWorker = function (worker) {
    const decoratedAsString = worker.decoratedAsString;
    let workerObjectURL;
    if (worker.workerObjectURL) {
        workerObjectURL = worker.workerObjectURL;
    } else {
        const workerBlob = new Blob([decoratedAsString], { type: "text/javascript" });
        workerObjectURL = URL.createObjectURL(workerBlob);
    }
    const instance = new Worker(workerObjectURL);
    if (worker.hope > 5) {
        // with so much hope the worker will never be terminated
        // remove for debugging
        URL.revokeObjectURL(workerObjectURL);
    } else {
        // keep for reuse
        worker.workerObjectURL = workerObjectURL;
    }
    worker.instance = instance;
    worker.instanciated = true;
};

const forceAwakenWorker = function (worker) {
    // a worker is awaken as soon as it receives it first message
    // this function can be used to awake the worker before it is used
    // can be a good idea when the worker needs time to set up
    const instance = worker.instance;
    instance.postMessage("");
    worker.awakened = true; // or will be in a few
};

const evaluateWorker = function (worker) {
    /* a worker with 0 hope was made to be used 1 time
    a worker with 100 hope was made to be used multiple times*/
    const hope = worker.hope;
    if (hope > 5) {
        return;
    }
    worker.instance.terminate();
    worker.instance = undefined;
    worker.instanciated = false;
    worker.awakened = false;
    worker.hasEventListener = false;

    if (hope > 0) {
        return;
    }
    delete workers[worker.name];
};

const addEventListenerToWorker = function (worker) {
    const instance = worker.instance;
    instance.addEventListener("message", function(event) {
        const message = event.data;
        const result = message.result;
        let length = worker.resolutionQueue.length;
        if (length !== 0) {
            const nextResolve = worker.resolutionQueue.shift();
            nextResolve(result);
            length = worker.resolutionQueue.length;
        } /* else report an error ? */

        if (length === 0) {
            evaluateWorker(worker);
        }
    });
    worker.hasEventListener = true;
};

const prepareWorker = function (worker, lazy, makesSenseToAwake = false) {
    // lazy is used for cascade pattern
    if (lazy > 4) {
        return;
    }
    if (!worker.loaded) {
        loadWorker(worker);
    }
    if (lazy > 3) {
        return;
    }
    if (!worker.decorated) {
        decorateWorker(worker);
    }
    if (lazy > 2) {
        return;
    }
    if (!worker.instanciated) {
        instanciateWorker(worker);
    }
    if (lazy > 1) {
        return;
    }
    if (!worker.hasEventListener) {
        addEventListenerToWorker(worker);
    }
    if (lazy > 0) {
        return;
    }
    if (!worker.awakened && makesSenseToAwake) {
        forceAwakenWorker(worker);
    }
};

const registerWorker = function (options) {
    const worker = Object.assign(
        {},
        WORKER_DEFAULT_OPTIONS,
        options,
        WORKER_INITIAL_SETTINGS
    );

    const loadMode = worker.loadMode;
    const ressource = worker.ressource;
    if (loadMode === SYMBOLS.STRING) {
        worker.originalAsString = ressource;
        worker.loaded = true;
    } else if (loadMode === SYMBOLS.DECORATED) {
        worker.decoratedAsString = ressource;
        worker.decorated = true;
        worker.loaded = true;
    }
    prepareWorker(worker, worker.lazy, true);
    workers[worker.name] = worker;
};

const work = function (name, input = []) {
    return new Promise(function (resolve, reject) {
        if (!Object.prototype.hasOwnProperty.call(workers, name)) {
            reject(`"${name}" not registered`);
        }
        const worker = workers[name];
        prepareWorker(worker, 0);
        worker.resolutionQueue.push(resolve);
        worker.instance.postMessage({
            input
        });
        worker.awakened = true;
    });
};


registerWorker({
    name: "doSomething",
    ressource: `function (a, b) {
                    return a + b;
                }`,
    loadMode: "string",
    lazy: 0,
    hope: 1
});

work("doSomething", [5, 4]).then(function (x) {
    console.log("#1", x);
    work("doSomething", [x, 4]).then(function (y) {
        console.log("#2", y);
    });
});
// work("doSomething", [5, 4]).then(function (x) {
    // console.log("#1", x);

// });
// work("doSomething", [40, 40]).then(function (y) {
    // console.log("#2", y);
// });
"use strict";
/* the function must be synchronous, to garantee in order receival, but also because of how, the return value is used

other options: timeOut (after how many ms, should we cancel the operation)

auto split (spawn more worker instances)2-4-8-16 auto based on feedback

implement lazy and hope

expose decorate to compile time

navigator.hardwareConcurrency

const URL = window.URL || window.webkitURL;

Recursion

Alternatives https://github.com/andywer/threads.js https://github.com/padolsey/operative

report progress (use Date.now as id, but allow dependency injection when needed)

allow multiple function per worker

handle error strategies validate before sending,

multiple results (wait for aggregation)
multiple results callback

convention pass done function so that setTimeOut works

what really happens after terminate
*/
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
    hope: 1,
};

// separate from WORKER_DEFAULT_OPTIONS, impossible to overwrite with options in registerWorker
const WORKER_INITIAL_SETTINGS = {
    loaded: false,
    originalAsString: "",
    decorated: false,
    decoratedAsString: "",
    instanciated: false,
    instance: {},
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
    worker.laoded = true;
};

const decorateWorker = function (worker) {
    const originalAsString = worker.originalAsString;
    worker.decoratedAsString = `

"use strict";
const doWork = ${originalAsString};
self.addEventListener("message", function(event) {
    const message = event.data;
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
    const workerBlob = new Blob([decoratedAsString], { type: "text/javascript" });
    const workerObjectURL = URL.createObjectURL(workerBlob);
    const instance = new Worker(workerObjectURL);
    URL.revokeObjectURL(workerObjectURL);
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

const addEventListenerToWorker = function (worker) {
    const instance = worker.instance;
    instance.addEventListener("message", function(event) {
        const message = event.data;
        const result = message.result;
        if (worker.resolutionQueue.length !== 0) {
            const nextResolve = worker.resolutionQueue.shift();
            nextResolve(result);
        } /* else report an error ? */
    });
    worker.hasEventListener = true;
};

const prepareWorker = function (worker, lazy, makesSenseToAwake = false) {
    // lazy is used for cascade pattern
    if (lazy > 5) {
        return;
    }
    if (!worker.loaded) {
        loadWorker(worker);
    }
    if (lazy > 4) {
        return;
    }
    if (!worker.decorated) {
        decorateWorker(worker);
    }
    if (lazy > 3) {
        return;
    }
    if (!worker.instanciated) {
        instanciateWorker(worker);
    }
    if (lazy > 2) {
        return;
    }
    if (!worker.hasEventListener) {
        addEventListenerToWorker(worker);
    }
    if (lazy > 1) {
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

    workers[worker.name] = worker;
    const loadMode = worker.loadMode;
    const ressource = worker.ressource;
    if (loadMode === SYMBOLS.STRING) {
        worker.originalAsString = ressource;
        worker.laoded = true;
    } else if (loadMode === SYMBOLS.STRING) {
        worker.decoratedAsString = ressource;
        worker.decorated = true;
        worker.laoded = true;
    } 
    prepareWorker(worker, worker.lazy, true);
};

const fetchWork = function (name, input = []) {
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
    });
};


registerWorker({
    name: "doSomething",
    ressource: `function (a, b) {
                    return a + b;
                }`,
    loadMode: "string",
    lazy: 10,
    hope: 1,
});

fetchWork("doSomething", [5, 4]).then(function (x) {
    console.log(x);
});
//
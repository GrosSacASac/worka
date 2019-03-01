/* optimisation ideas

remove unused things inside worker, like originalAsString if it is never going to be used again

could change workerWithLowestResolveQueue, instead of guessing what worker will be idle the soonest,
we could wait for the next worker to become idle, could be better than guessing,
especially for function that have variability in time needed for execution

proper de-registration for failures ?

alternative feature detection
https://github.com/pmav/web-workers/blob/master/assets-web-workers/javascript-webworkers-ui.js */

/*jslint
    browser, devel, fudge
*/


export {registerWorker, work, workerSupport, WORKA_SYMBOLS};

const workerSupport = {

    basic: (typeof Worker === `function`),
    // transferables: undefined
    // encapsulation: undefined // Worker inside Worker
};

/* transferables feature detection
a priori not supported in IE 10, 11
const smallArrayBuffer = new ArrayBuffer(1);
const emptyWorker = new Worker(`../empty-worker.js`);

emptyWorker.postMessage(smallArrayBuffer, [smallArrayBuffer]);

// length must be set to 0 in this context
workerSupport.transferables = (smallArrayBuffer.byteLength === 0)

*/

const workers = {};


const WORKA_SYMBOLS = {
    // loadMode
    STRING: Symbol(),
    DECORATED: Symbol(),
    FUNCTION: Symbol(),
    MULTI_FUNCTION: Symbol(),
    FILE: Symbol(),
    DECORATED_FILE: Symbol(),
    // errors
    NO_SUPPORT_ERROR: Symbol(),
    TIME_OUT_ERROR: Symbol(),
    SPLIT: `/`,
    JS_MIME: {type: `text/javascript`}
};

let max = 1;
if (typeof navigator === `object`) {
    max = navigator.hardwareConcurrency || max;
}
const WORKER_DEFAULT_OPTIONS = {
    name: ``,
    resource: ``,
    loadMode: WORKA_SYMBOLS.STRING,
    lazy: 5,
    hope: 6,
    max,
    stateless: true,
    initialize: false,
    timeOut: false
};

// impossible to accidentally overwrite
const WORKER_INITIAL_SETTINGS = {
    loaded: false,
    originalAsString: ``,
    decorated: false,
    decoratedAsString: ``,
    instanciated: false,
    workerObjectURL: undefined,
    instance: undefined,
    awakened: false,
    hasEventListener: false,
    resolveRejectQueue: undefined,
    inputQueue: undefined,
    workerStore: workers
};

const loadWorker = function (worker) {
    const resource = worker.resource;
    const loadMode = worker.loadMode;
    if (
        loadMode === WORKA_SYMBOLS.FUNCTION ||
        loadMode === WORKA_SYMBOLS.MULTI_FUNCTION
    ) {
        worker.originalAsString = resource.toString();
    }
    worker.loaded = true;
};

const useStrict = `"use strict";`;
/* convert to String because errorEvent can not be cloned*/
const errorHandler = `self.addEventListener(\`error\`, function (errorEvent) {
    errorEvent.preventDefault();
    let asString;
    if (errorEvent.message) {
        asString = errorEvent.message;
    } else {
        asString = String(errorEvent);
    }
    self.postMessage({
        error: asString
    });
});`;
const decorateWorker = function (worker) {
    const originalAsString = worker.originalAsString;
    const loadMode = worker.loadMode;
    let decoratedAsString;
    if (loadMode === WORKA_SYMBOLS.MULTI_FUNCTION) {
        decoratedAsString = `
${useStrict}
${errorHandler}
const functions = ${originalAsString}();
self.addEventListener(\`message\`, function(event) {
    const message = event.data;
    if (!Object.prototype.hasOwnProperty.call(message, \`input\`)) {
        return;
    }
    const input = message.input;
    const functionName = message.functionName;
    if (!Object.prototype.hasOwnProperty.call(functions, functionName)) {
        self.postMessage({
            error: \`\${functionName} not found\`
        });
        return;
    }
    self.postMessage({
        result: functions[functionName](input)
    });
});
        `;

    } else {
        let initializeSuffix;
        if (worker.stateless && !worker.initialize) {
            initializeSuffix = ``;
        } else {
            initializeSuffix = `()`;
        }
        decoratedAsString = `
${useStrict}
${errorHandler}
const doWork = ${originalAsString}${initializeSuffix};
self.addEventListener(\`message\`, function(event) {
    const message = event.data;
    if (!Object.prototype.hasOwnProperty.call(message, \`input\`)) {
        return; // only waking up
    }
    const input = message.input;
    self.postMessage({
        result: doWork(input)
    });
});
        `;
    }
    worker.decoratedAsString = decoratedAsString;
    worker.decorated = true;
};

const instanciateWorker = function (worker) {
    let workerObjectURL;
    if (worker.workerObjectURL) {
        workerObjectURL = worker.workerObjectURL;
    } else {
        const decoratedAsString = worker.decoratedAsString;
        const workerBlob = new Blob([decoratedAsString], WORKA_SYMBOLS.JS_MIME);
        workerObjectURL = URL.createObjectURL(workerBlob);
    }
    const instance = new Worker(workerObjectURL);
    if (worker.hope > 5 || worker.hope < 1) {
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
    instance.postMessage(``);
    worker.awakened = true; // or will be in a few
};

const forceTerminateWorker = function (worker) {
    if (worker.instance) {
        worker.instance.terminate();
    }
    worker.instance = undefined;
    worker.instanciated = false;
    worker.awakened = false;
    worker.hasEventListener = false;
};

const afterWorkerFinished = function (worker) {
    /* a worker with 0 hope was made to be used 1 time
    a worker with 100 hope was made to be used multiple times*/
    const length = worker.resolveRejectQueue.length;
    if (length !== 0) {
        if (worker.timeOut && worker.inputQueue.length !== 0) {
            worker.instance.postMessage(worker.inputQueue.shift());
        }
        // still has things to do
        return;
    }

    const hope = worker.hope;
    if (hope > 5) {
        return;
    }
    forceTerminateWorker(worker);

    if (hope > 0) {
        return;
    }
    delete worker.workerStore[worker.name];
};


const afterWorkerErrored = function (worker) {
    /* stop everything */
    const error = `request to worker canceled because an error occured before`;
    worker.resolveRejectQueue.forEach(function ([resolve, reject]) {
        reject(error);
    });

    forceTerminateWorker(worker);
    delete worker.workerStore[worker.name];
};

const addEventListenerToWorker = function (worker) {
    const instance = worker.instance;
    instance.addEventListener(`message`, function (event) {
        const message = event.data;
        const [resolve, reject] = worker.resolveRejectQueue.shift();
        if (Object.prototype.hasOwnProperty.call(message, `result`)) {
            const result = message.result;
            resolve(result);
            afterWorkerFinished(worker);
        } else if (Object.prototype.hasOwnProperty.call(message, `error`)) {
            const error = message.error;
            reject(error);
            afterWorkerErrored(worker);
        }
    });
    worker.hasEventListener = true;
};

const prepareWorkerTimeOut = function (worker, resolve, reject, preparedInput) {
    if (worker.resolveRejectQueue.length === 1) {
        worker.instance.postMessage(preparedInput);
    } else {
        worker.inputQueue.push(preparedInput);
    }

    setTimeout(function () {
        // if the resolveRejectQueue still includes the resolve, it means it has not yet
        // resolved
        if (worker.resolveRejectQueue.some(function ([resolveI]) {
            return resolve === resolveI;
        })) {
            /*const discardedResolve = */
            worker.resolveRejectQueue.shift();
            // forceTerminateWorker, because we don't care anymore about the result
            forceTerminateWorker(worker);
            if (worker.inputQueue.length !== 0) {
                instanciateWorker(worker);
                addEventListenerToWorker(worker);
            }
            afterWorkerFinished(worker);
            reject(WORKA_SYMBOLS.TIME_OUT_ERROR);
        }
    }, worker.timeOut);
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

const registerWorker = function (options, workerStore = workers) {
    if (!workerSupport.basic) {
        return;
    }
    const worker = {
        ...WORKER_DEFAULT_OPTIONS,
        ...options,
        ...WORKER_INITIAL_SETTINGS,
        workerStore
    };
    worker.resolveRejectQueue = [];
    if (worker.timeOut && worker.hope > 5) {
        worker.inputQueue = [];
        // need to manage input queue manually for timeouts
    }

    const loadMode = worker.loadMode;
    const resource = worker.resource;
    if (loadMode === WORKA_SYMBOLS.STRING) {
        worker.originalAsString = resource;
        worker.loaded = true;
    } else if (loadMode === WORKA_SYMBOLS.DECORATED) {
        worker.decoratedAsString = resource;
        worker.decorated = true;
        worker.loaded = true;
    }
    prepareWorker(worker, worker.lazy, true);
    workerStore[worker.name] = worker;
};

const findWorkerWithEmptyQueue = function (workerStore = workers) {
    // returns the worker found or undefined
    return Object.values(workerStore).find(function (worker) {
        return worker.resolveRejectQueue.length === 0;
    });
};

const workerWithLowestResolveQueue = function (workers) {
    return workers.reduce(function (workerWithLowestResolveQueueSoFar, worker) {
        if (
            worker.resolveRejectQueue.length <
            workerWithLowestResolveQueueSoFar.resolveRejectQueue.length
        ) {
            return worker;
        }
        return workerWithLowestResolveQueueSoFar;
    });
};

const work = function (name, input, workerStore = workers, forceWork = false) {
    /* is overloaded on many levels, could benefit from refactoring
    functionName not needed ? */
    if (!workerSupport.basic) {
        return Promise.reject(WORKA_SYMBOLS.NO_SUPPORT_ERROR);
    }
    let preparedInput;
    let workerName;
    let functionName;
    if (Array.isArray(name)) {
        [workerName, functionName] = name;
    } else {
        const nameSplit = name.split(WORKA_SYMBOLS.SPLIT);
        if (nameSplit.length === 2) {
            // worker.loadMode === WORKA_SYMBOLS.MULTI_FUNCTION
            [workerName, functionName] = nameSplit;

        } else {
            workerName = name;
        }
    }
    if (!Object.prototype.hasOwnProperty.call(workerStore, workerName)) {
        return Promise.reject(`${workerName} not registered`);
    }
    if (Object.prototype.hasOwnProperty.call(input, `input`)) {
        // already prepared
        preparedInput = input;
    } else {
        preparedInput = {
            input
        };
        if (functionName !== undefined) {
            preparedInput.functionName = functionName;
        }
    }
    const worker = workerStore[workerName];

    if (worker.stateless && worker.resolveRejectQueue.length !== 0 && !forceWork) {
        /* the worker is already doing something and it is stateless
        only stateless worker can duplicate themselves */
        if (!worker.coWorkers) {
            // the worker has not yet utilized this feature and needs to be initialized
            worker.coWorkers = {};
            worker.nextCoWorkerOptions = Object.assign({}, worker, {
                instanciated: false,
                hasEventListener: false,
                lazy: 10,
                hope: 1,
                coWorkers: undefined,
                max: 1,
                name: `0`,
                workerStore: worker.coWorkers
            });
        }
        const coWorkerCount = Object.keys(worker.coWorkers).length;

        if (coWorkerCount !== 0) {
            // there are already coWorkers
            const workerWithEmptyQueue = findWorkerWithEmptyQueue(worker.coWorkers);
            if (workerWithEmptyQueue) {
                // at least 1 is idle, give it something to do
                return work(
                    [workerWithEmptyQueue.name, functionName],
                    preparedInput,
                    worker.coWorkers
                );
            }
        }

        // there are no idle coworkers
        if ((coWorkerCount + 1) < worker.max) {
            /* the worker count is below maximum, we can create more
            + 1 is for the parent worker itself */
            const nameNow = worker.nextCoWorkerOptions.name;
            registerWorker(worker.nextCoWorkerOptions, worker.coWorkers);
            worker.nextCoWorkerOptions.name = String(Number(nameNow) + 1);
            return work([nameNow, functionName], preparedInput, worker.coWorkers);
        }

        /* search for the worker with the lowest resolution queue and delegate to it
        use a boolean to avoid infinite recursion loop */
        const bestWorker = workerWithLowestResolveQueue(
            Object.values(worker.coWorkers).concat(worker)
        );
        return work([bestWorker.name, functionName], preparedInput, bestWorker.workerStore, true);
    }

    // normal case
    return new Promise(function (resolve, reject) {
        worker.resolveRejectQueue.push([resolve, reject]);
        prepareWorker(worker, 0);
        worker.awakened = true;
        if (worker.timeOut) {
            prepareWorkerTimeOut(worker, resolve, reject, preparedInput);
        } else {
            worker.instance.postMessage(preparedInput);
        }
    });
};

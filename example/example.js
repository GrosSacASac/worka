import { registerWorker, FUNCTION, work } from "../source/worka.js";
import * as d from "./node_modules/dom99/built/dom99ES.js";
import {
    doNTimes,
    chainPromises,
    chainPromiseNTimes,
    timeFunction,
    timePromise,
    arrayWithResults,
} from "./node_modules/utilsac/utility.js";
import { estimatePi } from "./estimatePi.js";
import { estimatePiWorkerURL } from "./estimatePiPrepared.js";

const ESTIMATEPI_RAW_WORKER_URL = `estimatePiWorker.js`;
const ESTIMATEPI_RAW_WORKER_URL_NO_CACHE = `estimatePiWorkerNoCache.js`;
const ESTIMATE_PI_ACTION = `estimatePi`;
const SAMPLE_SIZE = 10;
const INITIAL_PRECISION_LEVEL = 2;

const getReferenceTime = function () {
    // return Date.now();
    return performance.now(); // can be more precise
};

const precisionFromPrecisionLevel = function (precisionLevel) {
    if (!precisionLevel) {
        precisionLevel = 3;
    }
    return 10 ** precisionLevel;
};

let precision = precisionFromPrecisionLevel(INITIAL_PRECISION_LEVEL);


registerWorker({
    name: `getPiEstimation`,
    resource: estimatePi,
    loadMode: FUNCTION,
});

registerWorker({
    name: `getPiEstimationForceRestart`,
    resource: estimatePi,
    loadMode: FUNCTION,
    hope: 5,
});



d.functions.setPrecision = function () {
    precision = precisionFromPrecisionLevel(Number(d.variables[`precisionLevel`]));
};

d.functions.webWorkerPreloaded = function () {
    const startTime = getReferenceTime();

    const worker = new Worker(estimatePiWorkerURL);
    worker.addEventListener(`message`, function (event) {
        const message = event.data;
        if (Object.prototype.hasOwnProperty.call(message, `result`)) {
            const { result } = message;
            const endTime = getReferenceTime();
            const duration = endTime - startTime;
            d.feed({
                result: `PI estimation: ${result}`,
                duration: `Computation time: ${duration}ms`,
            });
            worker.terminate();
        }

    });
    //the worker starts with the first postMessage
    worker.postMessage({
        action: ESTIMATE_PI_ACTION,
        input: precision,
    });
};

d.functions.webWorkerNoCache = function () {
    const startTime = getReferenceTime();

    const worker = new Worker(ESTIMATEPI_RAW_WORKER_URL_NO_CACHE);
    worker.addEventListener(`message`, function (event) {
        const message = event.data;
        if (Object.prototype.hasOwnProperty.call(message, `result`)) {

            const { result } = message;
            const endTime = getReferenceTime();
            const duration = endTime - startTime;
            d.feed({
                result: `PI estimation: ${result}`,
                duration: `Computation time: ${duration}ms`,
            });
            worker.terminate();
        }

    }, false);

    worker.postMessage({
        action: ESTIMATE_PI_ACTION,
        input: precision,
    });
};

d.functions.webWorkerWithCache = function () {
    const startTime = getReferenceTime();

    const worker = new Worker(ESTIMATEPI_RAW_WORKER_URL);
    worker.addEventListener(`message`, function (event) {
        const message = event.data;
        if (Object.prototype.hasOwnProperty.call(message, `result`)) {

            const { result } = message;
            const endTime = getReferenceTime();
            const duration = endTime - startTime;
            d.feed({
                result: `PI estimation: ${result}`,
                duration: `Computation time: ${duration}ms`,
            });
            worker.terminate();
        }

    }, false);

    worker.postMessage({
        action: ESTIMATE_PI_ACTION,
        input: precision,
    });
};

d.functions.remoteServer = function () {
    timePromise(function () {
        return fetch(`../estimatePi?input=${precision}`, {}).then(function (response) {
            return response.text();
        }).then(function (resultString) {
            const result = Number(resultString);
            return result;
        });
    }).then(function ({ timeElapsed, value }) {
        d.feed({
            result: value,
            duration: `Computation time: ${timeElapsed}ms`,
        });
    });

};



d.functions.withOutWebWorker = function () {
    let result;
    const duration = timeFunction(function () {
        result = estimatePi(precision);
    });
    d.feed({
        result: `PI estimation: ${result}`,
        duration: `Computation time: ${duration}ms`,
    });
};

d.functions.runFullTestSuite = function () {
    chainPromises([
        testWithoutWorker,
        testWithRemoteServer,
        testWithRawWorker,
        testWithWorkerCreatedEveryTime,
        testWithWorker,
        testWithWorkerAutoSplit,
    ]).then(function (allResults) {
        console.log(allResults);
        d.feed({
            allResults,
        });
    });

};

const addAggregatesStats = function (aggregates) {
    aggregates.meanTime = aggregates.totalComputationTime / aggregates.sampleSize;
    aggregates.setupTime = aggregates.totalTime - aggregates.totalComputationTime;
};

const testWithoutWorker = function () {
    const aggregates = {
        title: `Without Web Worker`,
        totalComputationTime: 0,
        meanTime: 0,
        totalTime: 0,
        setupTime: 0,
        sampleSize: SAMPLE_SIZE,
        results: [],
    };

    aggregates.totalTime = timeFunction(function () {
        doNTimes(function () {
            let piEstimation;
            const duration = timeFunction(function () {
                piEstimation = estimatePi(precision);
            });
            aggregates.results.push({
                precision,
                duration,
                piEstimation,
            });
            aggregates.totalComputationTime += duration;
        }, SAMPLE_SIZE);
    });
    addAggregatesStats(aggregates);

    return Promise.resolve(aggregates);
};


const testWithRemoteServer = function () {
    const aggregates = {
        title: `With Remote Server`,
        totalComputationTime: 0,
        meanTime: 0,
        totalTime: 0,
        setupTime: 0,
        sampleSize: SAMPLE_SIZE,
        results: [],
    };

    const remoteSeverWork = function () {
        return timePromise(function () {
            return fetch(`../estimatePi?input=${precision}`, {}).then(function (response) {
                return response.text();
            }).then(function (resultString) {
                const result = Number(resultString);
                return result;
            });
        }).then(function ({ timeElapsed, value }) {
            aggregates.totalComputationTime += timeElapsed;
            return {
                precision,
                duration: timeElapsed,
                piEstimation: value,
            };
        });
    };

    return timePromise(function () {
        return chainPromiseNTimes(remoteSeverWork, SAMPLE_SIZE);
    }).then(function ({ timeElapsed, value }) {
        aggregates.results = value;
        aggregates.totalTime = timeElapsed;
        addAggregatesStats(aggregates);
        return aggregates;
    });
};

const testWithRawWorker = function () {
    const aggregates = {
        title: `With Raw Web Worker`,
        totalComputationTime: 0,
        meanTime: 0,
        totalTime: 0,
        setupTime: 0,
        sampleSize: SAMPLE_SIZE,
        results: [],
    };

    const rawWorkerWork = function () {
        return new Promise(function (resolve) {
            const startTime = getReferenceTime();
            const worker = new Worker(ESTIMATEPI_RAW_WORKER_URL);
            worker.addEventListener(`message`, function (event) {
                const message = event.data;
                if (Object.prototype.hasOwnProperty.call(message, `result`)) {
                    const piEstimation = message.result;
                    const endTime = getReferenceTime();
                    const duration = endTime - startTime;

                    worker.terminate();
                    aggregates.totalComputationTime += duration;
                    resolve({
                        precision,
                        duration,
                        piEstimation,
                    });
                }
            });

            worker.postMessage({
                action: ESTIMATE_PI_ACTION,
                input: precision,
            });
        });
    };

    return timePromise(function () {
        return chainPromiseNTimes(rawWorkerWork, SAMPLE_SIZE);
    }).then(function ({ timeElapsed, value }) {
        aggregates.results = value;
        aggregates.totalTime = timeElapsed;
        addAggregatesStats(aggregates);
        return aggregates;
    });
};

const testWithWorkerCreatedEveryTime = function () {
    const aggregates = {
        title: `With Web Worker Created every time (worka)`,
        totalComputationTime: 0,
        meanTime: 0,
        totalTime: 0,
        setupTime: 0,
        sampleSize: SAMPLE_SIZE,
        results: [],
    };

    const workerWork = function () {
        return timePromise(function () {
            return work({ name: `getPiEstimationForceRestart`, input: precision }).catch(console.error);
        }).then(function ({ timeElapsed, value }) {
            aggregates.totalComputationTime += timeElapsed;
            return {
                precision,
                duration: timeElapsed,
                piEstimation: value,
            };
        });
    };

    return timePromise(function () {
        return chainPromiseNTimes(workerWork, SAMPLE_SIZE);
    }).then(function ({ timeElapsed, value }) {
        aggregates.results = value;
        aggregates.totalTime = timeElapsed;
        addAggregatesStats(aggregates);
        return aggregates;
    });
};

const testWithWorker = function () {
    const aggregates = {
        title: `With Web Worker  (worka)`,
        totalComputationTime: 0,
        meanTime: 0,
        totalTime: 0,
        setupTime: 0,
        sampleSize: SAMPLE_SIZE,
        results: [],
    };

    const workerWork = function () {
        return timePromise(function () {
            return work({ name: `getPiEstimation`, input: precision }).catch(console.error);
        }).then(function ({ timeElapsed, value }) {
            aggregates.totalComputationTime += timeElapsed;
            return {
                precision,
                duration: timeElapsed,
                piEstimation: value,
            };
        });
    };

    return timePromise(function () {
        return chainPromiseNTimes(workerWork, SAMPLE_SIZE);
    }).then(function ({ timeElapsed, value }) {
        aggregates.results = value;
        aggregates.totalTime = timeElapsed;
        addAggregatesStats(aggregates);
        return aggregates;
    });
};

const testWithWorkerAutoSplit = function () {
    const aggregates = {
        title: `With Web Worker auto split (worka)`,
        totalComputationTime: 0,
        meanTime: 0,
        totalTime: 0,
        setupTime: 0,
        sampleSize: SAMPLE_SIZE,
        results: [],
    };

    const workerWork = function () {
        return timePromise(function () {
            return work({ name: `getPiEstimation`, input: precision }).catch(console.error);
        }).then(function ({ timeElapsed, value }) {
            aggregates.totalComputationTime += timeElapsed;
            return {
                precision,
                duration: timeElapsed,
                piEstimation: value,
            };
        });
    };

    return timePromise(function () {
        const allPromises = arrayWithResults(workerWork, SAMPLE_SIZE);
        return Promise.all(allPromises);
    }).then(function ({ timeElapsed, value }) {
        aggregates.results = value;
        aggregates.totalTime = timeElapsed;
        addAggregatesStats(aggregates);
        return aggregates;
    });
};

d.feed({
    precisionLevel: INITIAL_PRECISION_LEVEL,
});
d.start();

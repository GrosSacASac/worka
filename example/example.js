/*global
    
    estimatePiWorkerCode, estimatePiWorkerJsBlob, estimatePiWorkerURL
*/


import { registerWorker, SYMBOLS, work } from "../source/worka.js";
import D from "./dom99.js";
import {
    doNTimes,
    chainPromises,
    chainPromiseNTimes,
    precisionFromPrecisionLevel,
    getReferenceTime,
    timeCallback,
    timePromise,
    fillArrayWithFunctionResult
    } from "./utility.js";
import estimatePi from "./estimatePi.js";
import { estimatePiWorkerURL } from "./estimatePiPrepared.js";

const ESTIMATEPI_RAW_WORKER_URL = "estimatePiWorker.js";
const ESTIMATEPI_RAW_WORKER_URL_NO_CACHE = "estimatePiWorkerNoCache.js";
const ESTIMATE_PI_ACTION = "estimatePi";
const SAMPLE_SIZE = 10;
const INITIAL_PRECISION_LEVEL = 2 || 5;

let precision = precisionFromPrecisionLevel(INITIAL_PRECISION_LEVEL);


registerWorker({
    name: "getPiEstimation",
    resource: estimatePi,
    loadMode: SYMBOLS.FUNCTION
});

registerWorker({
    name: "getPiEstimationForceRestart",
    resource: estimatePi,
    loadMode: SYMBOLS.FUNCTION,
    hope: 5
});



D.functions.setPrecision = function () {
    precision = precisionFromPrecisionLevel(Number(D.variables["precisionLevel"]));
};
    
D.functions.tryWithWebWorkerPreloaded = function () {
    const startTime = getReferenceTime();
    
    const worker = new Worker(estimatePiWorkerURL);
    worker.addEventListener("message", function(event) {
        const message = event.data;
        if (message.hasOwnProperty("result")) {
            const result = message.result;
            const endTime = getReferenceTime();
            const duration = endTime - startTime;
            D.feed({
                result: `PI estimation: ${result}`,
                duration: `Computation time: ${duration}ms`
            });
            worker.terminate();
        }

    });
    //the worker starts with the first postMessage
    worker.postMessage({
        action: ESTIMATE_PI_ACTION,
        input: precision
    });
};
    
D.functions.tryWithWebWorkerNoCache = function () {
    const startTime = getReferenceTime();
    
    const worker = new Worker(ESTIMATEPI_RAW_WORKER_URL_NO_CACHE);
    worker.addEventListener("message", function(event) {
        const message = event.data;
        if (message.hasOwnProperty("result")) {
            
            const result = message.result;
            const endTime = getReferenceTime();
            const duration = endTime - startTime;
            D.feed({
                result: `PI estimation: ${result}`,
                duration: `Computation time: ${duration}ms`
            });
            worker.terminate();
        }

    }, false);
    
    worker.postMessage({
        action: ESTIMATE_PI_ACTION,
        input: precision
    });
};

D.functions.tryWithRemoteServer  = function () {
    timePromise(function () {
        return fetch(`../estimatePi?input=${precision}`, {}).then(function (response) {
            return response.text();
        }).then(function (resultString) {
            const result = Number(resultString);
            return result;
        });
    }).then(function ({timeElapsed, value}) {
        D.feed({
            result: value,
            duration: `Computation time: ${timeElapsed}ms`
        });
    });

};


D.functions.tryWithWebWorker = function () {
    const startTime = getReferenceTime();
    
    const worker = new Worker(ESTIMATEPI_RAW_WORKER_URL);
    worker.addEventListener("message", function(event) {
        const message = event.data;
        if (message.hasOwnProperty("result")) {
            
            const result = message.result;
            const endTime = getReferenceTime();
            const duration = endTime - startTime;
            D.feed({
                result: `PI estimation: ${result}`,
                duration: `Computation time: ${duration}ms`
            });
            worker.terminate();
        }

    }, false);
    
    worker.postMessage({
        action: ESTIMATE_PI_ACTION,
        input: precision
    });
};

D.functions.tryWithOutWebWorker = function () {
    let result;
    const duration = timeCallback(function () {
        result = estimatePi(precision);
    });
    D.feed({
        result: `PI estimation: ${result}`,
        duration: `Computation time: ${duration}ms`
    });
};

D.functions.runFullTestSuite = function () {

    chainPromises([
        testWithoutWorker,
        testWithRawWorker,
        testWithWorkerCreatedEveryTime,
        testWithWorker,
        testWithWorkerAutoSplit
    ]).then(function (allResults) {
        console.log(allResults);
        D.feed({
            allResults
        });
    });
        
};

const addAggregatesStats = function (aggregates) {
    aggregates.meanTime = aggregates.totalComputationTime / aggregates.sampleSize;
    aggregates.setupTime = aggregates.totalTime - aggregates.totalComputationTime;
};

const testWithoutWorker = function () {
    const aggregates = {
        title: "Without Web Worker",
        totalComputationTime: 0,
        meanTime: 0,
        totalTime: 0,
        setupTime: 0,
        sampleSize: SAMPLE_SIZE,
        results: []
    };
    
    aggregates.totalTime = timeCallback(function () {
        doNTimes(function () {
            let piEstimation;
            const duration = timeCallback(function () {
                piEstimation = estimatePi(precision);
            });
            aggregates.results.push({
                precision,
                duration,
                piEstimation
            });
            aggregates.totalComputationTime += duration;
        }, SAMPLE_SIZE);
    });
    addAggregatesStats(aggregates)
    
    return Promise.resolve(aggregates);
};


const testWithRawWorker = function () {
    const aggregates = {
        title: "With Raw Web Worker",
        totalComputationTime: 0,
        meanTime: 0,
        totalTime: 0,
        setupTime: 0,
        sampleSize: SAMPLE_SIZE,
        results: []
    };
    
    const rawWorkerWork = function() {
        return new Promise(function (resolve, reject) {
            const startTime = getReferenceTime();
            const worker = new Worker(ESTIMATEPI_RAW_WORKER_URL);
            worker.addEventListener("message", function(event) {
                const message = event.data;
                if (message.hasOwnProperty("result")) {
                    const piEstimation = message.result;
                    const endTime = getReferenceTime();
                    const duration = endTime - startTime;
                    
                    worker.terminate();
                    aggregates.totalComputationTime += duration;
                    resolve({
                        precision,
                        duration,
                        piEstimation
                    });
                }
            });

            worker.postMessage({
                action: ESTIMATE_PI_ACTION,
                input: precision
            });
        });
    };
    
    return timePromise(function () {
        return chainPromiseNTimes(rawWorkerWork, SAMPLE_SIZE);
    }).then(function ({timeElapsed, value}) {
        aggregates.results = value;
        aggregates.totalTime = timeElapsed;
        addAggregatesStats(aggregates)
        return aggregates;
    });
};

const testWithWorkerCreatedEveryTime = function () {
    const aggregates = {
        title: "With Web Worker Created every time",
        totalComputationTime: 0,
        meanTime: 0,
        totalTime: 0,
        setupTime: 0,
        sampleSize: SAMPLE_SIZE,
        results: []
    };
    
    const workerWork = function() {
        return timePromise(function() {
            return work("getPiEstimationForceRestart", precision);
        }).then(function ({timeElapsed, value}) {
            aggregates.totalComputationTime += timeElapsed;
            return {
                precision,
                duration: timeElapsed,
                piEstimation: value
            };
        });
    };

    return timePromise(function () {
        return chainPromiseNTimes(workerWork, SAMPLE_SIZE);
    }).then(function ({timeElapsed, value}) {
        aggregates.results = value;
        aggregates.totalTime = timeElapsed;
        addAggregatesStats(aggregates)
        return aggregates;
    });
};

const testWithWorker = function () {
    const aggregates = {
        title: "With Web Worker",
        totalComputationTime: 0,
        meanTime: 0,
        totalTime: 0,
        setupTime: 0,
        sampleSize: SAMPLE_SIZE,
        results: []
    };

    const workerWork = function() {
        return timePromise(function() {
            return work("getPiEstimation", precision);
        }).then(function ({timeElapsed, value}) {
            aggregates.totalComputationTime += timeElapsed;
            return {
                precision,
                duration: timeElapsed,
                piEstimation: value
            };
        });
    };
    
    return timePromise(function () {
        return chainPromiseNTimes(workerWork, SAMPLE_SIZE);
    }).then(function ({timeElapsed, value}) {
        aggregates.results = value;
        aggregates.totalTime = timeElapsed;
        addAggregatesStats(aggregates)
        return aggregates;
    });
};

const testWithWorkerAutoSplit = function () {
    const aggregates = {
        title: "With Web Worker auto split",
        totalComputationTime: 0,
        meanTime: 0,
        totalTime: 0,
        setupTime: 0,
        sampleSize: SAMPLE_SIZE,
        results: []
    };

    const workerWork = function() {
        return timePromise(function() {
            return work("getPiEstimation", precision);
        }).then(function ({timeElapsed, value}) {
            aggregates.totalComputationTime += timeElapsed;
            return {
                precision,
                duration: timeElapsed,
                piEstimation: value
            };
        });
    };
    
    return timePromise(function () {
        const allPromises = fillArrayWithFunctionResult(workerWork, SAMPLE_SIZE);
        return Promise.all(allPromises);
    }).then(function ({timeElapsed, value}) {
        aggregates.results = value;
        aggregates.totalTime = timeElapsed;
        addAggregatesStats(aggregates)
        return aggregates;
    });
};

D.feed({
    precisionLevel: INITIAL_PRECISION_LEVEL
});
D.linkJsAndDom();


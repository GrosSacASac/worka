"use strict";
const D = dom99;

const doNTimes = function (times, task) {
    let i;
    for (i = 0; i < times; i += 1) {
        task();
    }
};

const chainPromiseNTimes = function (times, promiseCreator) {
    return new Promise(function (resolve, reject) {
        let i = 0;
        const chainer = function () {
            if (i < times) {
                promiseCreator().then(chainer);
            } else {
                resolve();
            }
            i += 1;
        };
        chainer();
    });

};

const SAMPLE_SIZE = 10;
const INITIAL_PRECISION_LEVEL = 5;

const precisionFromPrecisionLevel = function (precisionLevel) {
    if (!precisionLevel) {
        return 1000;
    }
    return 10 ** precisionLevel;
};

const piEstimationWorkerJsCode = `
const piEstimation  = function (precision) {
    /* PI Estimation, precision is also limiter by the Number type type precision
    correctness is affected by the randomness Math.random()*/
    const radius = 1;
    let xCoordinate;
    let yCoordinate;
    let intermediary;
    let i;
    let insideCounter = 0;
    
    for (i = 0; i < precision; i += 1) {
        xCoordinate = Math.random();
        yCoordinate = Math.random();
        
        intermediary = (xCoordinate ** 2) + (yCoordinate ** 2)
        // ** 0.5 is not required because we compare with 1;
        if (intermediary < radius) {
            insideCounter += 1;
        }
    }
    return (insideCounter / precision) * 4;
};

self.addEventListener("message", function(event) {
    const message = event.data;
    if (!message.hasOwnProperty("action")) {
        return;
    }
    const action = message.action;
    
    if (action === "piEstimation") {
    
        const precision = message.input;
        const result = piEstimation(precision);
        
        self.postMessage({
            piEstimationResult: "piEstimationResult",
            result
        });
    }

}, false);`;
const piEstimationWorkerJsBlob = new Blob([piEstimationWorkerJsCode], { type: "text/javascript" });
const piEstimationWorkerURL = URL.createObjectURL(piEstimationWorkerJsBlob);
    
    
D.fx.tryWithWebWorkerPreloaded = function () {
    const startTime = Date.now();
    const precision = precisionFromPrecisionLevel(Number(D.vr.precisionLevel));
    
    
    
    const worker = new Worker(piEstimationWorkerURL);
    worker.addEventListener("message", function(event) {
        const message = event.data;
        if (message.hasOwnProperty("piEstimationResult")) {
            
            const result = message.result;
            const endTime = Date.now();
            const duration = endTime - startTime;
            D.vr.result = `PI estimation: ${result}`;
            D.vr.duration = `Computation time: ${duration}ms`;
            worker.terminate();
        }

    });
    //the worker starts with the first postMessage
    worker.postMessage({
        action: "piEstimation",
        input: precision
    });
};


D.fx.tryWithWebWorker = function () {
    const startTime = Date.now();
    const precision = precisionFromPrecisionLevel(Number(D.vr.precisionLevel));
    
    const worker = new Worker("piEstimationWorker.js");
    worker.addEventListener("message", function(event) {
        const message = event.data;
        if (message.hasOwnProperty("piEstimationResult")) {
            
            const result = message.result;
            const endTime = Date.now();
            const duration = endTime - startTime;
            D.vr.result = `PI estimation: ${result}`;
            D.vr.duration = `Computation time: ${duration}ms`;
            worker.terminate();
        }

    }, false);
    //the worker starts with the first postMessage
    worker.postMessage({
        action: "piEstimation",
        input: precision
    });
};

D.fx.tryWithOutWebWorker = function () {
    const startTime = Date.now();
    const precision = precisionFromPrecisionLevel(Number(D.vr.precisionLevel));
    const result = piEstimation(precision);
    const endTime = Date.now();
    const duration = endTime - startTime;
    D.vr.result = `PI estimation: ${result}`;
    D.vr.duration = `Computation time: ${duration}ms`;
};

D.fx.runFullTestSuite = function () {
    const precision = precisionFromPrecisionLevel(Number(D.vr.precisionLevel));
    const results = [];
    const aggregates = {
        totalComputationTime: 0,
        meanTime: 0,
        totalTime: 0,
        setupTime: 0,
        sampleSize: SAMPLE_SIZE
    };
    const allStartTime = Date.now();
    doNTimes(SAMPLE_SIZE, function () {
        const startTime = Date.now();
        const result = piEstimation(precision);
        const endTime = Date.now();
        const duration = endTime - startTime;
        results.push({
            precision,
            duration,
            piEstimation: result
        });
        aggregates.totalComputationTime += duration;
    });
    const allEndTime = Date.now();
    aggregates.totalTime = allEndTime - allStartTime;
    aggregates.meanTime = aggregates.totalComputationTime / SAMPLE_SIZE;
    aggregates.setupTime = aggregates.totalTime - aggregates.totalComputationTime;
    
    console.log(results);
    D.vr.results = results;
    D.vr = aggregates;
    D.el.testSuiteResults.hidden = false;
    
    chainPromiseNTimes(SAMPLE_SIZE, );
};

D.linkJsAndDom();

D.vr.precisionLevel = INITIAL_PRECISION_LEVEL;

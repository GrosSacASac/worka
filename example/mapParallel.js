import { registerWorker, FUNCTION, work, mapParallel } from "../source/worka.js";
// import * as d from "./node_modules/dom99/built/dom99.es.js";
// import {
//     doNTimes,
//     chainPromises,
//     chainPromiseNTimes,
//     timeFunction,
//     timePromise,
// } from "./node_modules/utilsac/utility.js";
import { estimatePi } from "./estimatePi.js";

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

// let precision = precisionFromPrecisionLevel(INITIAL_PRECISION_LEVEL);


// d.feed({
//     precisionLevel: INITIAL_PRECISION_LEVEL,
// });
// d.start();

const levels = [1,2,3,4,5].map(precisionFromPrecisionLevel);


console.time(`regular`);
const results = levels.map(estimatePi);
console.timeEnd(`regular`);
console.log(results);

(async function {
    console.time(`worka`);
    const results = await Promise.all(mapParallel(estimatePi, levels));
    console.timeEnd(`worka`);
    console.log(results);

}());
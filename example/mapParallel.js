import { mapParallel } from "../source/arrayParallel.js";

import { estimatePi } from "./estimatePi.js";


const precisionFromPrecisionLevel = function (precisionLevel) {
    if (!precisionLevel) {
        precisionLevel = 3;
    }
    return 10 ** precisionLevel;
};

const levels = [8,8,8,8].map(precisionFromPrecisionLevel);


console.time(`regular`);
const regularResults = levels.map(estimatePi);
console.timeEnd(`regular`);
console.log(regularResults);

(async function () {
    console.time(`worka`);
    const results = await Promise.all(mapParallel(estimatePi, levels));
    console.timeEnd(`worka`);
    console.log(results);

}());
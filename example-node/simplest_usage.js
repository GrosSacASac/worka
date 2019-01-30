"use strict";
const {Worker} = require("worker_threads"); // node 10+


// patch
global.Worker = Worker;
console.warn("find Blob polyfill first\n");
// global.Blob =

const { registerWorker, WORKA_SYMBOLS, work } = require("../built/worka_require.js");

const sort = function (array) {
    array.sort(); // run time error will trigger the catch
    return array;
};

registerWorker({
    name: "sort",
    resource: sort,
    loadMode: WORKA_SYMBOLS.FUNCTION
});

work("sort", [1, 2, 3, -8, -5, 2, 3, 45, 5]).then(function (result) {
    console.log(result);
    console.log("after success");
});

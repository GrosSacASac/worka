"use strict";
const {Worker} = require("worker_threads"); // node 10+
// patch
global.Worker = Worker;
const { registerWorker, WORKA_SYMBOLS, work } = require("../built/worka_require.js");

registerWorker({
    name: "sort",
    resource: "./sort_worka.js",
    loadMode: WORKA_SYMBOLS.FILE
});

work("sort", [1, 2, 3, -8, -5, 2, 3, 45, 5]).then(function (result) {
    console.log(result);
    console.log("after success");
});

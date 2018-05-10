"use strict";
const {Worker} = require('webworker-threads');

global.Worker = Worker; // patch nodejs

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

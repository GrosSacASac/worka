import { Worker, isMainThread, parentPort } from 'worker_threads';
"use strict";
parentPort.addEventListener(`error`, function (errorEvent) {
    errorEvent.preventDefault();
    let asString;
    if (errorEvent.message) {
        asString = errorEvent.message;
    } else {
        asString = String(errorEvent);
    }
    parentPort.postMessage({
        error: asString,
    });
});
const doWork = (array) => {
    array.sort(function (a, b) {
        return a - b;
    });
    return array;
};
;
parentPort.addEventListener(`message`, async function(event) {
    const message = event.data;
    if (!Object.prototype.hasOwnProperty.call(message, `input`)) {
        return; // only waking up
    }
    const input = message.input;
    const result = await doWork(input);
    parentPort.postMessage({
        result,
    });
});

"use strict";
self.addEventListener(`error`, function (errorEvent) {
    errorEvent.preventDefault();
    let asString;
    if (errorEvent.message) {
        asString = errorEvent.message;
    } else {
        asString = String(errorEvent);
    }
    self.postMessage({
        error: asString,
    });
});
const doWork = function sort(array) {
    array.sort(); // run time error will trigger the catch
    return array;
};
self.addEventListener(`message`, function (event) {
    const message = event.data;
    if (!Object.prototype.hasOwnProperty.call(message, `input`)) {
        return; // only waking up
    }
    const {input} = message;
    self.postMessage({
        result: doWork(input),
    });
});

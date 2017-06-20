
export const fillArrayWithFunctionResult = function (aFunction, times) {
    const returnArray = [];
    let i;
    for (i = 0; i < times; i += 1) {
        returnArray.push(aFunction());
    }
    return returnArray;
};

export const doNTimes = function (task, times) {
    let i;
    for (i = 0; i < times; i += 1) {
        task();
    }
};

export const chainPromises = function (promiseCreators) {
    // different than Promise.all
    // only executes promiseCreator one after the previous has resolved
    // resolves with an array of values
    const length = promiseCreators.length;
    const values = [];
    if (length === 0) {
        return Promise.resolve(values);
    }
    return new Promise(function (resolve, reject) {
        let i = 0;
        const chainer = function (value) {
            i += 1;
            values.push(value);
            if (i < length) {
                promiseCreators[i]().then(chainer);
            } else {
                resolve(values);
            }
        };
        promiseCreators[i]().then(chainer);
    });
};

export const chainPromiseNTimes = function (promiseCreator, times) {
    // different than Promise.all
    // only executes promiseCreator one after the previous has resolved
    // useful for testing
    // resolves with an array of values
    
    // could be made with chainPromises, but chose not to
    // to avoid an adapter array
    const values = [];
    if (times === 0) {
        return Promise.resolve(values);
    }
    return new Promise(function (resolve, reject) {
        let i = 0;
        const chainer = function (value) {
            i += 1;
            values.push(value);
            if (i < times) {
                promiseCreator().then(chainer);
            } else {
                resolve(values);
            }
        };
        promiseCreator().then(chainer);
    });
};

export const precisionFromPrecisionLevel = function (precisionLevel) {
    if (!precisionLevel) {
        return 1000;
    }
    return 10 ** precisionLevel;
};


export const getReferenceTime = function () {
    // return Date.now();
    return performance.now(); // can be more precise
};

export const timeCallback = function (callback, nowFunction = getReferenceTime) {
    // executes callback and returns time elapsed in ms
    const startTime = nowFunction();
    callback();
    const endTime = nowFunction();
    return endTime - startTime;
};

export const timePromise = function (promiseCreator, nowFunction = getReferenceTime) {
    // returns a Promise that resolves with
    // the time elapsed for the promise to resolve and its value
    // executes promiseCreator and waits for it to resolve
    return new Promise(function (resolve, reject) {
        const startTime = nowFunction();
        promiseCreator().then(function (value) {
            const endTime = nowFunction();
            resolve({
                timeElapsed: endTime - startTime,
                value
            });
        });
    });
};

const estimatePi = function (precision) {
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

        intermediary = (xCoordinate ** 2) + (yCoordinate ** 2);
        // ** 0.5 is not required because we compare with 1;
        if (intermediary < radius) {
            insideCounter += 1;
        }
    }
    return (insideCounter / precision) * 4;
};

self.addEventListener(`message`, function (event) {
    const message = event.data;
    if (!Object.hasOwn(message, `action`)) {
        return;
    }
    const { action } = message;

    if (action === `estimatePi`) {

        const precision = message.input;
        const result = estimatePi(precision);

        self.postMessage({
            result,
        });
    }

});

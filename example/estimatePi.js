export { estimatePi };


const estimatePi = function (precision) {
    /* PI Estimation,
        precision is also limited by the Number type precision
        correctness can be affected by the randomness Math.random()*/
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
}

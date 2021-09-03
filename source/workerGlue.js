/*global doWork*/
/*eslint-env worker*/
self.addEventListener(`message`, async function(event) {
    const message = event.data;
    if (!Object.prototype.hasOwnProperty.call(message, `input`)) {
        return; // only waking up
    }
    const {input} = message;
    const result = await doWork(input);
    self.postMessage({
        result,
    });
});

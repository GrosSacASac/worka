/*global functions*/
/*eslint-env worker*/
self.addEventListener(`message`, async function(event) {
    const message = event.data;
    if (!Object.prototype.hasOwnProperty.call(message, `input`)) {
        return;
    }
    const input = message.input;
    const functionName = message.functionName;
    if (!Object.prototype.hasOwnProperty.call(functions, functionName)) {
        self.postMessage({
            error: `\${functionName} not found`
        });
        return;
    }

    const result = await functions[functionName](input);
    self.postMessage({
        result,
    });
});

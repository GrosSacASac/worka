export { makeSendFileAvailable };

import { createReadStream } from "node:fs";


// probably not the right way to do it
// todo
const makeSendFileAvailable = function (req, res, next) {
    res.sendFile = sendFile.bind(undefined, res);
    next();
};

const sendFile = function (res, filePath) {
    createReadStream(filePath).pipe(res);
};


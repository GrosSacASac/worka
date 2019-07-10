export { makeSendFileAvailable };
import { createReadStream } from "fs";


const makeSendFileAvailable = function (req, res, next) {
    res.sendFile = sendFile;
    next();
};

const sendFile = function (filePath) {
    const res = this;
    createReadStream(filePath).pipe(res);
};


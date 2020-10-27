export { makeSendFileAvailable };
import { createReadStream } from "fs";

// probably not the right way to do it
// todo
const makeSendFileAvailable = function (req, res, next) {
    res.sendFile = sendFile;
    next();
};

const sendFile = function (filePath) {
    const res = this;
    createReadStream(filePath).pipe(res);
};


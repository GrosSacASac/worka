import "./patchNodeWorker.js";
import { registerWorker, WORKA_SYMBOLS, work } from "../source/worka.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

registerWorker({
    name: `sort`,
    resource: `${__dirname}/sort_worka.js`,
    loadMode: WORKA_SYMBOLS.FILE
});

work(`sort`, [1, 2, 3, -8, -5, 2, 3, 45, 5]).then(function (result) {
    console.log(result);
    console.log(`after success`);
}).catch(error => {
    if (error === WORKA_SYMBOLS.NO_SUPPORT_ERROR) {
        console.error(`missing support`);
    } else if (error === WORKA_SYMBOLS.TIME_OUT_ERROR) {
        console.error(`time out error`);
    }
});

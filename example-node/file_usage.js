import "./patchNodeWorker.js";
import { registerWorker, FILE, NO_SUPPORT_ERROR, TIME_OUT_ERROR, work } from "../source/worka.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

registerWorker({
    name: `sort`,
    resource: `${__dirname}/sort_worka.js`,
    loadMode: FILE
});

work(`sort`, [1, 2, 3, -8, -5, 2, 3, 45, 5]).then(function (result) {
    console.log(result);
    console.log(`after success`);
}).catch(error => {
    if (error === NO_SUPPORT_ERROR) {
        console.error(`missing support`);
    } else if (error === TIME_OUT_ERROR) {
        console.error(`time out error`);
    } else {
        console.error(error);
    }
});

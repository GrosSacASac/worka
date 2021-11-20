import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname } from "node:path";
import "./patchNodeWorker.js";
import { registerWorker, FILE, NO_SUPPORT_ERROR, TIME_OUT_ERROR, work } from "../../source/worka.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(pathToFileURL(`${__dirname}/../../sort_worka.js`).href);
// console.log(`file:///C:/files/worka/sort_worka.js`) 

registerWorker({
    name: `sort`,
    /* Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only file and data URLs are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'c:'  */    
    resource: pathToFileURL(`${__dirname}/../../sort_worka.js`).href,
    
    /* TypeError [ERR_INVALID_FILE_URL_PATH]: File URL path must be absolute */
    // resource: `file:///C/files/worka/sort_worka.js`,

    /* TypeError [ERR_INVALID_URL_SCHEME]: The URL must be of scheme file */
    // resource: `${__dirname}/../../sort_worka.js`,
    loadMode: FILE,
    hope: 0,
    timeout: 100,
});

work({ name: `sort`, input: [1, 2, 3, -8, -5, 2, 3, 45, 5] }).then(function (result) {
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

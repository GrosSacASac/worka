import { registerWorker, FILE, NO_SUPPORT_ERROR, TIME_OUT_ERROR, work } from "../source/worka.js";
import { __ } from 'https://deno.land/x/dirname/mod.ts';


const { __filename, __dirname } = __(import.meta);

console.log(`${__dirname}/sort_worka.js`.substr(1));
console.log(`${__dirname}/w.ts`.substr(1));

const tsWorker = new Worker(`${__dirname}/w.ts`.substr(1));
tsWorker.postMessage("Hello World");

registerWorker({
    name: `sort`,
    resource: `${__dirname}/sort_worka.js`.substr(1),
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

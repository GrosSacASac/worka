import { registerWorker, FILE, NO_SUPPORT_ERROR, TIME_OUT_ERROR, work } from "../../source/worka.js";
import makeloc from 'https://cdn.deno.land/dirname/versions/1.1.2/raw/mod.ts'//https://x.nest.land/dirname@v1.1.2/mod.ts'


const { __dirname,  __filename } = makeloc(import.meta);


// console.log(`${__dirname}sort_worka.js`.substr(1));

registerWorker({
    name: `sort`,
    resource: `file:///${__dirname}../../sort_worka.js`,
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

import makeloc from "https://cdn.deno.land/dirname/versions/1.1.2/raw/mod.ts";//https://x.nest.land/dirname@v1.1.2/mod.ts"


const { __dirname,  __filename } = makeloc(import.meta);


console.log(`${__dirname}w.ts`.substr(1));

const tsWorker = new Worker(`file:///${__dirname}w.ts`, {
    type: `module`,
});
tsWorker.postMessage(`Hello World`);

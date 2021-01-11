import { decorateWorker } from "./worka.js";
import fsPromises from "fs/promises";
import { writeTextInFile } from "filesac";

const [, , input, output] = process.argv;

(async function () {
    const originalAsString = await fsPromises.readFile(input, `utf-8`);
    const worker = {
        originalAsString,
        decoratedAsString: undefined,
        stateless: true,
    };
    decorateWorker(worker);

    // or use > in cli
    await writeTextInFile(output, worker.decoratedAsString);
    console.log(worker.decoratedAsString);
}());



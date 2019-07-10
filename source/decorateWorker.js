import { decorateWorker } from "./worka.js";
import { writeTextInFile, textFileContent } from "filesac";

const [x, y, input, output] = process.argv;

(async function () {
    const originalAsString = await textFileContent(input);
    const worker = {
        originalAsString,
        decoratedAsString: undefined
    };
    decorateWorker(worker);

    // or use > in cli
    await writeTextInFile(output, worker.decoratedAsString);
    console.log(worker.decoratedAsString);
}());



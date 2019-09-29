import polka from "polka";
import { estimatePi } from "./estimatePi.js";
import { makeSendFileAvailable } from "./sendFile.js";
import serveStatic from "serve-static";
import { fileURLToPath } from 'url';
import { dirname } from 'path';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const parent = dirname(__dirname);
const serveStaticHere = serveStatic(parent);

const commandLineInput = process.argv.slice(2);
const [port] = commandLineInput;
const ARTIFICIAL_DELAY = 50; // ms
const EXPLANATION = "using artificial delay to simulate real network: " + ARTIFICIAL_DELAY + "ms";

const PORT = port || 3000;
const realSimulation = true;
const app = polka()


app.get('/estimatePi', function (req, res) {
    const query = req.query;
    if (!Object.prototype.hasOwnProperty.call(query, "input")) {
        res.status(400);
        res.end();
        return;
    }
    const input = query.input;
    const precision = parseInt(input, 10);
    if (!isFinite(precision)) {
        res.status(400);
        res.end();
        return;
    }
    let stringToSend;
    if (realSimulation) {
        stringToSend = String(estimatePi(precision));
    } else {
        stringToSend = String(Math.PI);
    }
    console.log(EXPLANATION);
    setTimeout(function () {
        res.end(stringToSend);
    }, ARTIFICIAL_DELAY);

});

app.get('/example/estimatePiWorkerNoCache.js', function (req, res) {
    // force no cache, to get an idea how much it is helping
    console.log(EXPLANATION);
    setTimeout(function () {
        res.sendFile(`${__dirname}/estimatePiWorker.js`, {
            lastModified: false,
            cacheControl: false,
            etag: false
        });
    }, ARTIFICIAL_DELAY);


});
app.get('/example/estimatePiWorker.js', function (req, res) {
    console.log("estimatePiWorker.js from network ");
    console.log(EXPLANATION);
    setTimeout(function () {
        res.sendFile(`${__dirname}/estimatePiWorker.js`, {
            maxAge: 120000
        });
    }, ARTIFICIAL_DELAY);
});

app.use(serveStaticHere);
app.use(makeSendFileAvailable);
app.listen(PORT, function () {
    console.log(
        `Example app listening on port ${PORT}! ,
    open
http://localhost:${PORT}/example/example.html`
    );
});

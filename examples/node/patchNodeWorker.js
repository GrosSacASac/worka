// incomatible with regular web worker
// import { Worker } from "worker_threads"; // node (core module) 10+

import Worker from "web-worker";

// patch
if (!global.Worker) {
    global.Worker = Worker;
} 

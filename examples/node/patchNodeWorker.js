import { Worker } from "worker_threads"; // node 10+
// patch
global.Worker = Worker;

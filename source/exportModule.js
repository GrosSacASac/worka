// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import

// in another file import { registerWorker, SYMBOLS, work } from "../source/worka.js";
// this does not work
// SyntaxError: missing '}' after export specifier list
// export {
    // worka.registerWorker as registerWorker,
    // worka.work as work,
    // worka.workerSupport as workerSupport,
    // worka.SYMBOLS as SYMBOLS,
// };

// this does
export const registerWorker = worka.registerWorker;
export const work = worka.work;
export const workerSupport = worka.workerSupport;
export const SYMBOLS = worka.SYMBOLS;
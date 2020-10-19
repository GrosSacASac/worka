# Changelog

## 10.1.0

 * Functions provided to registerWorker can also return Promises
 * Requires async await support


## 10.0.0

 * Worker is a module by default
 * Works with Deno


## 9.1.0

 * Add arrayParallel.js

## 9.0.0

 * Rename `built/worka_require.js` into `built/worka.cjs`
 * Rename `built/worka_script.js` into `built/worka.iife.js`
 * Move Changelog to changelog.md

## 8.0.0

 * Symbols are exported individually
 * work expects an object as argument
 * for MULTI_FUNCTION, functionName is separated from name

## 7.0.0

 * Move to ES Module first

## 6.1.0

 * build-time decorateWorker exposed, FILE loadMode support

## 6.0.0

 * built/worka_script.js and built/worka_require.js removed from git
 * Use npm or run build yourself.

## 5.0.0

 * Symbol is expected to be defined. Cleanup behaviour after error occurs, instead of never settled promised

## 4.0.3

 * Now importable with require. See built/worka_require.js

## 4.0.0

 * Run time errors inside the worker will cause the catch statement to be executed with the error message inside as String. See example/workaRunTimeError.html Syntax Errors are not managed (same as before)

## 3.1.3

 * Now importable as script. See built/worka_script.js

## 3.0.0

 * Renamed SYMBOLS into WORKA_SYMBOLS

## 2.1.1

 * Do less when there is no web worker support

## 2.0.6

 * add `.npmignore` for light npm install
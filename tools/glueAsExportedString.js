import fs from "fs";

const codeToExportAsString = [
    //source, destination, 
    {
        source: "./source/workerGlue.js",
        destination: "./built/workerGlueString.js",
        exportName: "workerGlue"
    },
    {
        source: "./source/workerGlueMulti.js",
        destination: "./built/workerGlueMultiString.js",
        exportName: "workerGlueMulti"
    },
    {
        source: "./source/workerErrorHandler.js",
        destination: "./built/workerErrorHandlerString.js",
        exportName: "workerErrorHandler"
    },
]

codeToExportAsString.map(({source, destination, exportName}) => {
    const glueCode = fs.readFileSync(source, { encoding: "utf8"});
    // we could minify the code
    
    const asExportedJsString = `export {${exportName}};
const ${exportName} = ${JSON.stringify(glueCode)}`;
    fs.writeFileSync(destination, asExportedJsString);
});


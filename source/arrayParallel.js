export {
    mapParallel,
};

import {
    registerWorker,
    work,
    FUNCTION,
} from "./worka.js";


const privateName = `arrayParallel.js`;
const mapParallel = function (mapper, list) {
    registerWorker({
        name: privateName,
        resource: mapper,
        loadMode: FUNCTION,
    });
    return list.map(function (item) {
        return work({name: privateName, input: [item]});
    });
};

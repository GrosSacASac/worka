//dom99.js
/*jslint
    es6, maxerr: 200, browser, devel, fudge, maxlen: 100, node
*/
/*
    need to update all examples and docs

    forget should work on templates

    update readme, make a link to the new docs

    remake intro play ground
    [Try the intro playground](http://jsbin.com/kepohibavo/1/edit?html,js,output)

    document DVRP, DVRPL, CONTEXT element extension,
    use WeakMap instead where supported


    decide when to use event
        .target
        .orignialTarget
        .currentTarget


    when to use is="" syntax
    think about overlying framework

    add data-list-strategy to allow opt in declarative optimization
    data-function-context to allow context less elements
*/
const D = (function () {
    "use strict";

    //root collections
    const variablesSubscribers = {};
    const variables = {};
    const elements = {};
    const functions = {};

    const templateElementFromCustomElementName = {};
    let pathIn = [];

    let directiveSyntaxFunctionPairs;

    const MISS = "MISS";
    const CONTEXT = "CONTEXT";
    const DVRPL = "DVRPL";
    const DVRP = "DVRP";
    const ELEMENT_LIST_ITEM = "ELEMENT_LIST_ITEM";
    const CUSTOM = "CUSTOM";
    const INSIDE_SYMBOL = ">";
    const DEFAULT_INPUT_TYPE = "text";

    const hasOwnProperty = Object.prototype.hasOwnProperty;

    const isObjectOrArray = function (x) {
        /*array or object*/
        return (typeof x === "object" && x !== null);
    };

    const copyArrayFlat = function (array1) {
        return array1.slice();
    };

    const valueElseMissDecorator = function (object1) {
        /*Decorator function around an Object to provide a default value
        Decorated object must have a MISS key with the default value associated
        Arrays are also objects
        */
        return function (key) {
            if (hasOwnProperty.call(object1, key)) {
                return object1[key];
            }
            return object1[MISS];
        };
    };

    const propertyFromTag = valueElseMissDecorator({
        //Input Type : appropriate property name to retrieve and set the value
        "INPUT": "value",
        "TEXTAREA": "value",
        "PROGRESS": "value",
        "SELECT": "value",
        "IMG": "src",
        "SOURCE": "src",
        "AUDIO": "src",
        "VIDEO": "src",
        "TRACK": "src",
        "SCRIPT": "src",
        "OPTION": "value",
        "LINK": "href",
        "DETAILS": "open",
        MISS: "textContent"
    });

    const propertyFromInputType = valueElseMissDecorator({
        //Input Type : appropriate property name to retrieve and set the value
        "checkbox": "checked",
        "radio": "checked",
        MISS: "value"
    });

    const inputEventFromType = valueElseMissDecorator({
        "checkbox": "change",
        "radio": "change",
        "range": "change",
        "file": "change",
        MISS: "input"
    });

    const eventFromTag = valueElseMissDecorator({
        "SELECT": "change",
        "INPUT": "input",
        "BUTTON": "click",
        MISS: "click"
    });

    const options = {
        attributeValueDoneSign: "*",
        tokenSeparator: "-",
        listSeparator: " ",
        directives: {
            directiveFunction: "data-function",
            directiveVariable: "data-variable",
            directiveElement: "data-element",
            directiveList: "data-list",
            directiveInside: "data-inside",
            directiveTemplate: "data-template"
        },

        variablePropertyFromElement: function (element) {
            const tagName = element.tagName || element;
            if (tagName === "INPUT") {
                return propertyFromInputType(element.type || DEFAULT_INPUT_TYPE);
            }
            return propertyFromTag(tagName);
        },

        eventNameFromElement: function (element) {
            const tagName = element.tagName;
            if (tagName === "INPUT") {
                return inputEventFromType(element.type);
            }
            return eventFromTag(tagName);
        },

        tagNamesForUserInput: [
            "INPUT",
            "TEXTAREA",
            "SELECT",
            "DETAILS"
        ]
    };

    const createElement2 = function (elementDescription) {
        const element = document.createElement(elementDescription.tagName);
        /*element.setAttribute(attr, value) is good to set initial attr like you do in html
        setAttribute won t change the current .value,
        for instance, setAttribute is the correct choice for creation
        element.attr = value is good to change the live values*/
        Object.keys(elementDescription).forEach(function (key) {
            if (key !== "tagName") {
                element.setAttribute(key, elementDescription[key]);
            }
        });
        return element;
    };

    const walkTheDomElements = function (element, function1) {
        function1(element);
        if (element.tagName !== "TEMPLATE") {// IE bug: templates are not inert
            element = element.firstElementChild;
            while (element) {
                walkTheDomElements(element, function1);
                element = element.nextElementSibling;
            }
        }
    };

    const customElementNameFromElement = function (element) {
        return element.getAttribute("is") || element.tagName.toLowerCase();
    };

    const addEventListener = function (element, eventName, function1, useCapture = false) {
        element.addEventListener(eventName, function1, useCapture);
    };

    const contextFromEvent = function (event) {
        if (event.target) {
            const element = event.target;
            if (hasOwnProperty.call(element, CONTEXT)) {
                return element[CONTEXT];
            }
        }
        console.warn(event,
        `has no context. contextFromEvent for top level elements is not needed.`);
        return "";
    };

    const contextFromArray = function (pathIn) {
        return pathIn.join(INSIDE_SYMBOL);
    };

    const contextFromArrayWith = function (pathIn, withWhat) {
        if (pathIn.length === 0) {
            return withWhat;
        }
        return `${contextFromArray(pathIn)}${INSIDE_SYMBOL}${withWhat}`;
    };

    const notify = function (subscribers, value, path = "") {
        // could also only take path and get subscribers + value with path
        if (value === undefined) {
            // console.warn(`Do not use undefined values for feed`);
            // should this happen ?
            return;
        }
        if (Array.isArray(value)) {
            const list = value;
            subscribers.forEach(function (currentElement) {
                const fragment = document.createDocumentFragment();
                if (hasOwnProperty.call(
                    templateElementFromCustomElementName, currentElement[CUSTOM]
                    )) {
                    // composing with custom element
                    const templateElement = templateElementFromCustomElementName[
                        currentElement[CUSTOM]
                    ];
                    const previous = copyArrayFlat(pathIn);
                    pathIn = path.split(INSIDE_SYMBOL);
                    list.forEach(function (unused, i) {
                        const key = String(i);
                        enterObject(key);
                        const templateClone = cloneTemplate(templateElement);
                        linkJsAndDom(templateClone);
                        leaveObject();
                        fragment.appendChild(templateClone);
                    });
                    pathIn = previous;
                } else {
                    list.forEach(function (value) {
                        const listItem = document.createElement(currentElement[ELEMENT_LIST_ITEM]);
                        if (isObjectOrArray(value)) {
                            Object.assign(value, listItem);
                        } else {
                            listItem[currentElement[DVRPL]] = value;
                        }
                        fragment.appendChild(listItem);
                    });
                }
                currentElement.innerHTML = "";
                currentElement.appendChild(fragment);
            });
        } else {
            // console.log(subscribers, "subscribers");
            subscribers.forEach(function (currentElement) {
                currentElement[currentElement[DVRP]] = value;
            });
        }
    };

    const feed = function (data, startPath = "") {
        if (!isObjectOrArray(data)) {
            console.error("feed takes input, must be object");
        }
        let normalizedPath = startPath;
        if (startPath) {
            normalizedPath = `${startPath}${INSIDE_SYMBOL}`;
            // this is because "a>b>c" is irregular
            // "a>b>c>" or ">a>b>c" would not need such normalization
        }
        Object.entries(data).forEach(function ([key, value]) {
            const path = `${normalizedPath}${key}`;
            if (!isObjectOrArray(value)) {
                variables[path] = value;
                if (hasOwnProperty.call(variablesSubscribers, path)) {
                    notify(variablesSubscribers[path], value);
                }
            } else {
                const insidePath = `${path}${INSIDE_SYMBOL}`;

                if (Array.isArray(value)) {
                    forgetContext(insidePath);
                    feed(value, path /* could include boolean to not forgetContext inside,
                as it would do nothing*/);
                    variables[path] = value;
                    if (hasOwnProperty.call(variablesSubscribers, path)) {
                        notify(variablesSubscribers[path], value, path);
                    }
                } else {
                    feed(value, path);
                }
            }
        });
    };

    /*not used
    alternative use the new third argument options, once
    const onceAddEventListener = function (element, eventName, function1, useCapture=false) {
        let tempFunction = function (event) {
            //called once only
            function1(event);
            element.removeEventListener(eventName, tempFunction, useCapture);
        };
        addEventListener(element, eventName, tempFunction, useCapture);
    };*/

    const applyDirectiveFunction = function (element, eventName, functionName) {
        if (!functions[functionName]) {
            console.error(`Event listener ${functionName} not found.`);
        }
        addEventListener(element, eventName, functions[functionName]);
        element[CONTEXT] = contextFromArray(pathIn);
    };

    const tryApplyDirectiveFunction = function (element, customAttributeValue) {
        /* todo add warnings for syntax*/
        customAttributeValue.split(options.listSeparator).forEach(
            function (customAttributeValueSplit) {
                const tokens = customAttributeValueSplit.split(options.tokenSeparator);
                let functionName;
                let eventName;
                if (tokens.length === 1) {
                    functionName = tokens[0];
                    eventName = options.eventNameFromElement(element);
                } else {
                    [eventName, functionName] = tokens;
                }
                applyDirectiveFunction(element, eventName, functionName);
            }
        );
    };

    const applyDirectiveList = function (element, customAttributeValue) {
        /* js array --> DOM list
        <ul data-list="var-li"></ul>

        always throws away the entire dom list,
        let user of dom99 opt in in updates strategies such as
            same length, different content
            same content, different length
            key based identification
            */
        const [variableName, elementListItem, optional] = customAttributeValue
            .split(options.tokenSeparator);
        let fullName = "-";

        if (!variableName) {
            console.error(element,
            `Use ${options.directives.directiveList}="variableName-tagName" format!`);
        }

        if (optional) {
            // for custom elements
            fullName = `${elementListItem}-${optional}`;
            element[CUSTOM] = fullName;
        } else {
            element[DVRPL] = options.variablePropertyFromElement(elementListItem.toUpperCase());
            element[ELEMENT_LIST_ITEM] = elementListItem;
        }

        const path = contextFromArrayWith(pathIn, variableName);

        if (hasOwnProperty.call(variablesSubscribers, path)) {
            variablesSubscribers[path].push(element);
        } else {
            variablesSubscribers[path] = [element];
        }

        // console.log("should notify once", path, variables[path]);
        // will also remake the previous if any, which is less than ideal todo
        // can have negative consequences for multiple elements that share the same list
        notify(variablesSubscribers[path], variables[path], path)

    };

    const applyDirectiveVariable = function (element, variableName) {
        /* two-way bind
        example : called for <input data-variable="a">
        in this example the variableName = "a"
        we push the <input data-variable="a" > element in the array
        that holds all elements which share this same "a" variable
        undefined assignment are ignored, instead use empty string*/

        if (!variableName) {
            console.error(element, `Use ${options.directives.directiveVariable}="variableName" format!`);
        }

        element[DVRP] = options.variablePropertyFromElement(element);
        const path = contextFromArrayWith(pathIn, variableName);
        if (hasOwnProperty.call(variablesSubscribers, path)) {
            variablesSubscribers[path].push(element);
        } else {
            variablesSubscribers[path] = [element];
        }
        element[element[DVRP]] = variables[path]; // has latest

        if (options.tagNamesForUserInput.includes(element.tagName)) {
            const broadcastValue = function (event) {
                //wil call setter to broadcast the value
                const value = event.target[event.target[DVRP]];
                variables[path] = value;
                notify(variablesSubscribers[path], value);
            };
            addEventListener(
                element,
                options.eventNameFromElement(element),
                broadcastValue
            );
        }
    };

    const applyDirectiveElement = function (element, customAttributeValue) {
        /* stores element for direct access !*/
        const elementName = customAttributeValue;

        if (!elementName) {
            console.error(element, `Use ${options.directives.directiveElement}="elementName" format!`);
        }
        const path = contextFromArrayWith(pathIn, elementName);
        elements[path] = element;
    };

    const applyDirectiveTemplate = function (element, customAttributeValue) {
        /* stores a template element for later reuse !*/
        if (!customAttributeValue) {
            console.error(element, `Use ${options.directives.directiveTemplate}="d-name" format!`);
        }

        templateElementFromCustomElementName[customAttributeValue] = element;
    };

    const applyDirectiveInside = function (element, key) {
        /* looks for an html template to render
        also calls applyDirectiveElement with key!*/
        if (!key) {
            console.error(element, `Use ${options.directives.directiveInside}="insidewhat" format!`);
        }

        const templateElement = templateElementFromCustomElementName[
            customElementNameFromElement(element)
        ];

        enterObject(key);
        const templateClone = cloneTemplate(templateElement);
        linkJsAndDom(templateClone);
        leaveObject();
        element.appendChild(templateClone);
    };

    const cloneTemplate = (function () {
        const errorMessage = `Template  <template ${options.directives.directiveTemplate}="d-name">
    Template Content
</template>`;
        if ("content" in document.createElement("template")) {
            return function (templateElement) {
                if (!templateElement) {
                    console.error(errorMessage);
                }
                return document.importNode(templateElement.content, true);
            };
        }

        return function (templateElement) {
            /*here we have a div too much (messes up css)*/
            if (!templateElement) {
                console.error(errorMessage);
            }
            const clone = document.createElement("div");
            clone.innerHTML = templateElement.innerHTML;
            return clone;
        };
    }());

    const enterObject = function (key) {
        pathIn.push(key);
    };

    const leaveObject = function () {
        pathIn.pop();
    };

    const deleteAllStartsWith = function (object, prefix) {
        Object.keys(object).forEach(function (key) {
            if (key.startsWith(prefix)) {
                delete object[key];
            }
        });
    };

    const forgetContext = function (path) {
        /*Removing a DOM element with .remove() or .innerHTML = "" will NOT delete
        all the element references if you used the underlying nodes in dom99
        A removed element will continue receive invisible automatic updates
        it also takes space in the memory.

        And all of this doesn't matter for 1-100 elements

        */
        deleteAllStartsWith(variablesSubscribers, path);
        deleteAllStartsWith(variables, path);
    };

    const tryApplyDirectives = function (element) {
        /* looks if the element has dom99 specific attributes and tries to handle it*/
        // todo make sure no impactfull read write
        if (!element.hasAttribute) {
            return;
        }

        directiveSyntaxFunctionPairs.forEach(function (pair) {
            const [directiveName, applyDirective] = pair;

            if (!element.hasAttribute(directiveName)) {
                return;
            }
            const customAttributeValue = element.getAttribute(directiveName);
            if (customAttributeValue[0] === options.attributeValueDoneSign) {
                return;
            }

            applyDirective(element, customAttributeValue);

            // ensure the directive is only applied once
            element.setAttribute(directiveName,
                    options.attributeValueDoneSign + customAttributeValue);
        });
        if (element.hasAttribute(options.directives.directiveInside) ||
            element.hasAttribute(options.directives.directiveList)) {
            return;
        }
        /*using a custom element without data-in*/
        let customElementName = customElementNameFromElement(element);
        if (hasOwnProperty.call(templateElementFromCustomElementName, customElementName)) {
            element.appendChild(
                cloneTemplate(templateElementFromCustomElementName[customElementName])
            );
        }
    };

    const linkJsAndDom = function (startElement = document.body) {
        //build array only once and use up to date options, they should not reset twice
        if (!directiveSyntaxFunctionPairs) {
            directiveSyntaxFunctionPairs = [
                /*order is relevant applyDirectiveVariable being before applyDirectiveFunction,
                we can use the just changed live variable in the bind function*/
                [options.directives.directiveElement, applyDirectiveElement],
                [options.directives.directiveVariable, applyDirectiveVariable],
                [options.directives.directiveFunction, tryApplyDirectiveFunction],
                [options.directives.directiveList, applyDirectiveList],
                [options.directives.directiveInside, applyDirectiveInside],
                [options.directives.directiveTemplate, applyDirectiveTemplate]
            ];
        }
        walkTheDomElements(startElement, tryApplyDirectives);
        return startElement;
    };

    const start = function (userFunctions = {}, initialFeed = {}, startElement) {
        Object.assign(functions, userFunctions);
        feed(initialFeed);
        linkJsAndDom(startElement);
    };

    // https://github.com/piecioshka/test-freeze-vs-seal-vs-preventExtensions
    return Object.freeze({
        start,
        linkJsAndDom,
        elements,
        functions,
        variables,
        feed,
        createElement2, // still need to expose ?
        forgetContext, // still need to expose ?
        // also add clear template too free dom nodes,
        // can be usefull if sure that template not going to be used again
        contextFromArray,
        contextFromEvent,
        options
    });
}());

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
    module.exports = D;
}

export default D;

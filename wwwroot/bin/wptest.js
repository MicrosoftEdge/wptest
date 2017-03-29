///
/// This files contains a few helpers just because I am lazy :)
///
/// <reference path="mithril.d.ts" />
var d = document;
var w = window;
var $ = document.querySelector.bind(document);
var $$ = document.querySelectorAll.bind(document);
var eFP = document.elementFromPoint.bind(document);
var gCS = window.getComputedStyle.bind(window);
var gBCW = elm => elm.getBoundingClientRect().width;
var gBCH = elm => elm.getBoundingClientRect().height;
var gBCT = elm => elm.getBoundingClientRect().top;
var gBCL = elm => elm.getBoundingClientRect().left;
var gBCB = elm => elm.getBoundingClientRect().bottom;
var gBCR = elm => elm.getBoundingClientRect().right;
var rAF = window.requestAnimationFrame.bind(window);
var describe = function (elm) {
    return elm.nodeName + (elm.id ? `#${elm.id}` : '') + (elm.classList.length ? `.${elm.classList[0]}` : '');
};
var convertObjectToDescription = function (arg) {
    if (arg === null)
        return "null";
    if (arg === undefined)
        return "undefined";
    if (arg instanceof String)
        return arg; // only string objects can get through
    if (typeof arg == "number") {
        if (Number.isNaN(arg))
            return "Number.NaN";
        if (!Number.isFinite(arg) && arg >= 0)
            return "Number.POSITIVE_INFINITY";
        if (!Number.isFinite(arg) && arg <= 0)
            return "Number.NEGATIVE_INFINITY";
        return JSON.stringify(arg);
    }
    if (typeof arg == 'function') {
        try {
            return `${arg}`;
        }
        catch (ex) { }
        return '[object Function]';
    }
    var tag = '', str = '', jsn = '';
    try {
        tag = Object.prototype.toString.call(arg);
    }
    catch (ex) { }
    ;
    try {
        str = `${arg}`;
    }
    catch (ex) { }
    try {
        jsn = JSON.stringify(arg);
    }
    catch (ex) { }
    if (str == tag) {
        str = '';
    }
    if (tag == '[object Object]')
        tag = '';
    if (arg.cloneNode && 'outerHTML' in arg) {
        try {
            return arg.cloneNode(false).outerHTML + ' ' + jsn;
        }
        catch (ex) { }
    }
    if (tag && (typeof (arg) == 'object' || typeof (arg) == 'symbol')) {
        try {
            return [tag, str, jsn].filter(x => x).join(' ');
        }
        catch (ex) { }
    }
    if (jsn)
        return jsn;
    if (str)
        return str;
    if (tag)
        return tag;
    return "[object]";
};
var buildSelectorFor = function (elm) {
    var isValidPair = (selector, elm) => {
        var matches = elm.ownerDocument.querySelectorAll(selector);
        return (matches.length == 1) && (matches[0] === elm);
    };
    var isValid = (selector) => {
        return isValidPair(selector, elm);
    };
    var getPossibleAttributesFor = (elm) => [
        // #id
        ...getIdsOf(elm).map(a => [
            { selector: `#${escapeIdentForCSS(a)}`, slot: 'id' }
        ]),
        // tagname
        [
            { selector: getTagNameOf(elm), slot: 'tag' }
        ],
        // .class
        ...getClassesOf(elm).map(c => [
            { selector: `.${escapeIdentForCSS(c)}`, slot: 'class' }
        ]),
        // tagname|#id ... [attribute]
        ...getAttributesOf(elm).map(a => [
            elm.id ? { selector: `#${escapeIdentForCSS(a)}`, slot: 'id' } : { selector: getTagNameOf(elm), slot: 'tag' },
            { selector: `[${a}]`, slot: 'class' } // atributes should never be non-css, and some have att=value
        ]),
        // tagname ... :nth-of-type(<int>)
        [
            { selector: getTagNameOf(elm), slot: 'tag' },
            { selector: `:nth-of-type(${getNthTypeOf(elm)})`, slot: 'pseudo' }
        ],
    ];
    var buildSelectorFrom = (input) => {
        var tag = '';
        var ids = '';
        var cls = '';
        var pse = '';
        for (var ss of input) {
            for (var s of ss) {
                switch (s.slot) {
                    case 'tag': {
                        tag = tag || s.selector;
                        break;
                    }
                    case 'id': {
                        ids = ids || s.selector;
                        break;
                    }
                    case 'class': {
                        cls += s.selector;
                        break;
                    }
                    case 'pseudo': {
                        pse += s.selector;
                        break;
                    }
                }
            }
        }
        return tag + ids + cls + pse;
    };
    var escapeIdentForCSS = (item) => ((item.split('')).map(function (character) {
        if (character === ':') {
            return "\\" + (':'.charCodeAt(0).toString(16).toUpperCase()) + " ";
        }
        else if (/[ !"#$%&'()*+,.\/;<=>?@\[\\\]^`{|}~]/.test(character)) {
            return "\\" + character;
        }
        else {
            return encodeURIComponent(character).replace(/\%/g, '\\');
        }
    }).join(''));
    var getTagNameOf = (elm) => escapeIdentForCSS(elm.tagName.toLowerCase());
    var getNthTypeOf = (elm) => {
        var index = 0, cur = elm;
        do {
            if (cur.tagName == elm.tagName) {
                index++;
            }
        } while (cur = cur.previousElementSibling);
        return index;
    };
    var getIdsOf = (elm) => {
        return elm.id ? [elm.id] : [];
    };
    var getClassesOf = (elm) => {
        var result = [];
        for (var i = 0; i < elm.classList.length; i++) {
            result.push(elm.classList[i]);
        }
        return result;
    };
    var getAttributesOf = (elm) => {
        var result = [];
        for (var i = 0; i < elm.attributes.length; i++) {
            switch (elm.attributes[i].name.toLowerCase()) {
                case "id":
                case "class":
                case "style": break;
                case "name": if (/^[_-a-z0-9]+$/i.test(elm.getAttribute('name'))) {
                    result.push('name="' + elm.getAttribute('name') + '"');
                    break;
                }
                case "type": if (elm instanceof HTMLInputElement) {
                    result.push('type=' + elm.type);
                    break;
                }
                default: result.push(elm.attributes[i].name);
            }
        }
        return result;
    };
    var buildLocalSelectorFor = (elm, prelude) => {
        // let's try to build a selector using the element only
        var options = getPossibleAttributesFor(elm);
        if (isValid(prelude + buildSelectorFrom(options))) {
            // let's remove stuff from the end until we can't
            var cur_opts = options.slice(0);
            var sav_opts = options.slice(options.length);
            while (cur_opts.length > 1 || (cur_opts.length > 0 && sav_opts.length > 0)) {
                var dropped_option = cur_opts.pop();
                var new_opts = sav_opts.length ? cur_opts.concat(sav_opts) : cur_opts;
                if (!isValid(prelude + buildSelectorFrom(new_opts))) {
                    sav_opts.unshift(dropped_option);
                }
            }
            // build the minimal selector
            var new_opts = sav_opts.length ? cur_opts.concat(sav_opts) : cur_opts;
            let elementSelector = buildSelectorFrom(new_opts);
            // if we could not remove :nth-of-type and have no prelude, we might want to add a prelude about the parent
            let parent = elm.parentElement;
            if (!prelude && ~elementSelector.indexOf(':nth-of-type')) {
                if (parent) {
                    // this will help disambiguate things a bit
                    if (parent.id) {
                        prelude = `#${escapeIdentForCSS(parent.id)} > `;
                    }
                    else if (~(['HTML', 'BODY', 'HEAD', 'MAIN'].indexOf(parent.tagName))) {
                        prelude = `${escapeIdentForCSS(getTagNameOf(parent))} > `;
                    }
                    else if (parent.classList.length) {
                        prelude = `${escapeIdentForCSS(getTagNameOf(parent))}.${escapeIdentForCSS(parent.classList[0])} > `;
                    }
                    else {
                        prelude = `${escapeIdentForCSS(getTagNameOf(parent))} > `;
                    }
                    // maybe we can even remove the nth-of-type now?
                    let simplifiedElementSelector = elementSelector.replace(/:nth-of-type\(.*?\)/, '');
                    if (isValid(prelude + simplifiedElementSelector)) {
                        elementSelector = simplifiedElementSelector;
                    }
                }
            }
            return prelude + elementSelector;
        }
        else if (prelude) {
            // the given prelude is not valid
            return null;
        }
        else {
            // let's see if we can just reply :root
            if (!elm.parentElement) {
                return ':root';
            }
            // let's try to find an id parent which can narrow down to one element only
            let generalPrelude = '';
            let cur = elm.parentElement;
            while (cur = cur.parentElement) {
                if (cur.id) {
                    let r = buildLocalSelectorFor(elm, `#${escapeIdentForCSS(cur.id)} `);
                    if (r)
                        return r;
                    break;
                }
            }
            // let's try again but this time using a class
            cur = elm.parentElement;
            while (cur = cur.parentElement) {
                if (cur.classList.length) {
                    for (let ci = 0; ci < cur.classList.length; ci++) {
                        let r = buildLocalSelectorFor(elm, `.${escapeIdentForCSS(cur.classList[ci])} `);
                        if (r)
                            return r;
                    }
                }
            }
            // let's just append this selector to a unique selector to its parent
            //TODO: actually, we should filter based on whether we find the element uniquely instead, not its parent
            let parentSelector = buildSelectorFor(elm.parentElement);
            return buildLocalSelectorFor(elm, parentSelector + " > ");
        }
    };
    return buildLocalSelectorFor(elm, '');
};
///
/// This file contains mithril extensions to build my own framework
///
/// <reference path="monaco.d.ts" />
/// <reference path="wptest-helpers.tsx" />
m.route.prefix('#');
var amountOfRedrawSuspenders = 0;
function suspendRedrawsOn(codeToRun) {
    // add one more suspender to the list
    amountOfRedrawSuspenders += 1;
    // remove the suspender on completion
    new Promise(codeToRun).then(redrawIfReady, redrawIfReady);
    function redrawIfReady() {
        if (--amountOfRedrawSuspenders == 0) {
            // actually redraw if all suspenders are cleared
            m.redraw();
        }
    }
}
function redrawIfReady() {
    if (amountOfRedrawSuspenders == 0) {
        m.redraw();
    }
}
m.prop = function (cv) {
    return function (nv) {
        if (arguments.length >= 1) {
            if (cv !== nv) {
                cv = nv;
                redrawIfReady();
            }
        }
        else {
            return cv;
        }
    };
};
m.prop2 = function (get, set) {
    return function (nv) {
        if (arguments.length >= 1) {
            set(nv);
        }
        else {
            return get(nv);
        }
    };
};
m.addProps = function (o) {
    var r = Object.create(o);
    for (let key in o) {
        if (Object.prototype.hasOwnProperty.call(o, key)) {
            Object.defineProperty(r, key, { get() { return o[key]; }, set(v) { o[key] = v; redrawIfReady(); } });
            r[key + '$'] = function (v) {
                if (arguments.length == 0) {
                    return o[key];
                }
                else {
                    o[key] = v;
                }
            };
        }
    }
    return r;
};
React = {
    createElement(t, a, ...children) {
        return typeof (t) == 'string' ? m(t, a, children) : m(t(), a, children);
    }
};
class Tag {
    constructor() {
        this.prototype = Object.prototype;
    }
    with(prototype) {
        this.prototype = prototype;
        return this;
    }
    from(view) {
        var jsTagImplementation = {
            __proto__: this.prototype,
            state: Object.create(null),
            view(n) {
                var output = view(n.attrs, n.children, this);
                if (output instanceof Array) {
                    // no single wrapper --> no attribute generation
                    var outputName = n.attrs['of'] || 'body';
                    iterateChildrenArray(output);
                }
                else if (output.tag) {
                    var outputName = output.attrs ? (output.attrs['as'] || output.tag) : output.tag;
                    output.children && iterateChildrenArray(output.children);
                    if (n.attrs && n.attrs['of']) {
                        output.attrs || (output.attrs = Object.create(null));
                        output.attrs['of'] = n.attrs['of'];
                    }
                }
                return output;
                //-------------------------------------------------------------
                function iterateChildrenArray(nodes) {
                    for (var child of nodes) {
                        if (child instanceof Array) {
                            iterateChildrenArray(child);
                        }
                        else if (typeof (child) == 'object') {
                            child.attrs = child.attrs || {};
                            if (!child.attrs['of']) {
                                child.attrs['of'] = outputName;
                            }
                            if (child.children) {
                                iterateChildrenArray(child.children);
                            }
                        }
                        else {
                            // text nodes do not need an attribute
                        }
                    }
                }
            }
        };
        return () => jsTagImplementation;
    }
}
function cachedCast(input$, convertInput) {
    var currentInp = undefined;
    var currentOut = undefined;
    return function () {
        var inp = input$();
        if (inp !== currentInp) {
            currentInp = inp;
            currentOut = convertInput(inp);
        }
        return currentOut;
    };
}
function cachedDualCast(input$, convertInput, convertOutput) {
    var currentInp = undefined;
    var currentOut = undefined;
    return function (v) {
        if (arguments.length >= 1) {
            if (currentOut !== v) {
                input$(convertOutput(v));
                return v;
            }
        }
        else {
            var inp = input$();
            if (inp !== currentInp) {
                currentOut = convertInput(inp);
            }
            return currentOut;
        }
    };
}
function bindTo(x, attr = "value") {
    return m.withAttr(attr, x);
}
function attributesOf(a) {
    var o = Object.create(null);
    for (var key of Object.getOwnPropertyNames(a)) {
        if (key[key.length - 1] != '$') {
            o[key] = a[key];
        }
    }
    return o;
}
///
/// This file contains the view model of the application
///
/// <reference path="lib/wptest-framework.tsx" />
/// <reference path="lib/model.d.ts" />
function appendToConsole(logo, content) {
    var jsPaneConsoleOutput = window.jsPaneConsoleOutput;
    if (jsPaneConsoleOutput) {
        var textContent = convertObjectToDescription(content);
        var logoSpan = document.createElement("span");
        {
            logoSpan.textContent = `${logo} `;
        }
        var contentSpan = document.createElement("span");
        {
            contentSpan.textContent = textContent;
        }
        var entry = document.createElement("div");
        {
            entry.title = textContent;
            entry.appendChild(logoSpan);
            entry.appendChild(contentSpan);
            entry.setAttribute('data-logo', logo);
        }
        jsPaneConsoleOutput.appendChild(entry);
        jsPaneConsoleOutput.scrollTop = jsPaneConsoleOutput.scrollHeight;
    }
}
/** Converts the javascript code of watches to standard javascript */
function expandShorthandsIn(jsCode) {
    return (jsCode
        .replace(/^\$\$\(/g, 'document.querySelectorAll(')
        .replace(/^\$\(/g, 'document.querySelector(')
        .replace(/\b\$\$\(/g, 'document.querySelectorAll(')
        .replace(/\b\$\(/g, 'document.querySelector(')
        .replace(/(\;|\,|\(|\)|\+|\-|\*|\/|\=|\<|\>|\||\&|\\|\s)\$\$\(/g, '$1document.querySelectorAll(')
        .replace(/(\;|\,|\(|\)|\+|\-|\*|\/|\=|\<|\>|\||\&|\\|\s)\$\(/g, '$1document.querySelector(')
        .replace(/^eFP\(/g, 'document.elementFromPoint(')
        .replace(/^eFP\b/g, 'document.elementFromPoint.bind(document)')
        .replace(/\beFP\(/g, 'document.elementFromPoint(')
        .replace(/\beFP\b/g, 'document.elementFromPoint.bind(document)')
        .replace(/^gCS\(/g, 'getComputedStyle(')
        .replace(/^gCS\b/g, 'getComputedStyle.bind(window)')
        .replace(/^rAF\(/g, 'requestAnimationFrame(')
        .replace(/^rAF\b/g, 'requestAnimationFrame.bind(window)')
        .replace(/\bgCS\(/g, 'getComputedStyle(')
        .replace(/\bgCS\b/g, 'getComputedStyle.bind(window)')
        .replace(/\brAF\(/g, 'requestAnimationFrame(')
        .replace(/\brAF\b/g, 'requestAnimationFrame.bind(window)')
        .replace(/\.gBCW\(\)/g, '.getBoundingClientRect().width')
        .replace(/\.gBCH\(\)/g, '.getBoundingClientRect().height')
        .replace(/\.gBCL\(\)/g, '.getBoundingClientRect().left')
        .replace(/\.gBCT\(\)/g, '.getBoundingClientRect().top')
        .replace(/\.gBCR\(\)/g, '.getBoundingClientRect().right')
        .replace(/\.gBCB\(\)/g, '.getBoundingClientRect().bottom')
        .replace(/^describe\(/g, "(node => node.nodeName + (node.id ? '#' + node.id : '') + (node.classList.length ? '.' + node.classList[0] : ''))(")
        .replace(/\bdescribe\(/g, "(node => node.nodeName + (node.id ? '#' + node.id : '') + (node.classList.length ? '.' + node.classList[0] : ''))("));
}
/** The data of the test being writter (as JSON) */
var tmData = {
    id: undefined,
    title: "UntitledTest",
    html: "",
    css: "",
    jsBody: "",
    jsHead: "",
    watches: []
};
/** The data of the test being written (as ViewModel) */
var tm = m.addProps(tmData);
/** The data used to represent the current state of the view */
class ViewModel {
    constructor() {
        // ===================================================
        // github state (readonly)
        // ===================================================
        this.githubUserData$ = cachedCast(() => document.cookie, cookie => {
            // read data from the user cookie (and trust it)
            var userCookie = decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent('user').replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || 'null';
            // parse that data into an object
            var user = null;
            try {
                user = JSON.parse(userCookie.substr(2, userCookie.length - 46));
            }
            catch (ex) { }
            ;
            // return the result
            return user;
        });
        this.githubIsConnected$ = cachedCast(this.githubUserData$, user => !!user);
        this.githubUserName$ = cachedCast(this.githubUserData$, user => user ? user.username : "anonymous");
        this.githubUserId$ = cachedCast(this.githubUserData$, user => user ? user.id : null);
        this.githubUserEmail$ = cachedCast(this.githubUserData$, user => user ? user.email : null);
        // ===================================================
        // editor settings
        // ===================================================
        /** The id of the currently edited test */
        this.currentTestId$ = m.prop("new");
        /** The combined jsHead and jsBody */
        this.jsCombined$ = function (v) {
            if (arguments.length == 0) {
                var jsHead = tm.jsHead;
                var jsBody = tm.jsBody;
                if (jsHead) {
                    jsBody = '//<head>\r\n' + jsHead + '\r\n//</head>\r\n' + jsBody;
                }
                return jsBody;
            }
            else {
                var jsHead = '';
                var jsBody = v;
                jsBody = jsBody.replace(/^\/\/<head>\r\n((.|\r|\n)*)\r\n\/\/<\/head>\r\n/, function (m, code) {
                    jsHead = code;
                    return '';
                });
                tm.jsHead = jsHead;
                tm.jsBody = jsBody;
            }
        };
        // ===================================================
        // jsPane settings
        // ===================================================
        /** The id of the currently active tab */
        this.activeJsTab$ = m.prop('jsPaneWatches');
        // ===================================================
        // watch settings
        // ===================================================
        /** The readonly watches for the selected element */
        this.autoWatches = [
            "describe($0)",
            "$0.gBCW()",
            "$0.gBCH()",
            "gCS($0).display",
            "gCS($0).position",
            "gCS($0).marginLeft",
            "gCS($0).marginTop",
            "gCS($0).marginRight",
            "gCS($0).marginBottom",
            "gCS($0).borderLeftWidth",
            "gCS($0).borderTopWidth",
            "gCS($0).borderRightWidth",
            "gCS($0).borderBottomWidth",
            "gCS($0).paddingLeft",
            "gCS($0).paddingTop",
            "gCS($0).paddingRight",
            "gCS($0).paddingBottom",
            "describe($0.offsetParent)",
            "$0.offsetLeft",
            "$0.offsetTop",
        ].concat((e => {
            var ds = Array.from(getComputedStyle(document.documentElement)).sort();
            return ds.map(prop => `gCS($0)['${prop}']`);
        })());
        /** Cache of the values of the watches (as js object) */
        this.watchValues = Object.create(null);
        /** Cache of the values of the watches (as string) */
        this.watchDisplayValues = Object.create(null);
        /** Special flag map of watches to hide (because they have been pinned) */
        this.hiddenAutoWatches = Object.create(null);
        /** The text currently used as display-filter input for the watches */
        this.watchFilterText$ = m.prop("");
        /** The actual test used as display-filter for the watches (readonly) */
        this.watchFilter$ = cachedCast(() => this.watchFilterText$(), (filterText) => {
            // if no text in the search box, every watch matches
            var isTextMatching = (expr) => true;
            // convert the text into a matcher
            if (filterText.length > 0) {
                // normal case = indexOf search
                var filterTextLC = filterText.toLowerCase();
                isTextMatching = expr => !!~expr.toLowerCase().indexOf(filterTextLC);
                // special case if regexp is typed
                if (filterText.indexOf('/') == 0) {
                    var reg = null;
                    try {
                        reg = reg || eval(filterText);
                    }
                    catch (ex) { }
                    try {
                        reg = reg || eval(filterText + '/i');
                    }
                    catch (ex) { }
                    if (reg instanceof RegExp) {
                        isTextMatching = expr => reg.test(expr);
                    }
                }
            }
            // return the matcher
            return { matches: isTextMatching };
        });
        // ===================================================
        // watch replacement dialog
        // ===================================================
        this.welcomeDialog = new WelcomeDialogViewModel(this);
        // ===================================================
        // watch replacement dialog
        // ===================================================
        this.searchDialog = new SearchDialogViewModel(this);
        // ===================================================
        // watch replacement dialog
        // ===================================================
        this.selectorGenerationDialog = new SelectorGenerationDialogViewModel(this);
        // ===================================================
        // settings dialog
        // ===================================================
        this.settingsDialog = new SettingsDialogViewModel(this);
        // ===================================================
        // output frame settings
        // ===================================================
        /** Whether the mouse is being tracked to select a new element */
        this.isPicking$ = m.prop(false);
        /** The currently to-be-selected element under the mouse */
        this.selectedElement$ = m.prop(null);
        /** Whether a line jump is advised in the html editor */
        this.shouldMoveToSelectedElement$ = m.prop(false);
        /** The mapping between current source lines and source lines at the time of the last run */
        this.lineMapping = [0];
        /** How many source lines the current run had */
        this.lineMappingLineCount = 1;
        /** Cache of the auto-generated IDs, for cleaning purpose */
        this.idMappings = new Set();
        /** Whether the test model is still waiting on some data from the server */
        this.isLoading$ = m.prop(false);
    }
    /** Adds an expression to the list of watches (eventually bootstrapped with a value) */
    addPinnedWatch(expr, value) {
        // check that we have a base on which pinning this expression makes sense
        var processedExpression = expr;
        if (~expr.indexOf("$0")) {
            var w1 = window;
            if (!w1.$0) {
                // cannot pin an auto watch when no element is on the stack
                return;
            }
            else if (w1.$0replacement || w1.$0.id) {
                // we already know how to replace $0 by a stable expression
                processedExpression = processedExpression.replace(/\$0/g, w1.$0replacement || w1.$0.id);
            }
            else {
                // we need to show the dialog before replacing $0 by $0replacement
                var dialog = this.selectorGenerationDialog;
                dialog.watchExpression$(expr);
                dialog.watchValue$({ defined: arguments.length >= 2, value: value });
                dialog.autoId$(w1.$0.sourceTagId || '');
                dialog.chosenMode$(w1.$0.sourceTagId ? 'auto' : 'selector');
                dialog.chosenId$(w1.$0.sourceTagId || '');
                dialog.chosenSelector$(buildSelectorFor(w1.$0));
                dialog.isOpened$(true);
                return;
            }
        }
        // actually pin this expresion now that the safety checks have run
        tm.watches.push(processedExpression);
        if (arguments.length >= 2) {
            // a value was provided for us, let's use it
            vm.watchValues[processedExpression] = value;
            vm.watchDisplayValues[processedExpression] = `${value}`; // TODO
        }
        else if (expr in vm.watchValues) {
            // we just pinned some auto watch
            vm.watchValues[processedExpression] = vm.watchValues[expr];
            vm.watchDisplayValues[processedExpression] = vm.watchDisplayValues[expr];
            vm.hiddenAutoWatches[expr] = true;
        }
        else {
            // we have no recollection of this watch, recompute everything
            vm.refreshWatches();
        }
        redrawIfReady();
    }
    /** Removes an expression from the list of watches */
    removePinnedWatch(expr) {
        var index = tm.watches.indexOf(expr);
        if (index >= 0) {
            tm.watches.splice(index, 1);
        }
        redrawIfReady();
    }
    /** Recomputes the values and display values of watches */
    refreshWatches(elm) {
        // possibly push elm on the stack of selected elements
        if (elm) {
            var w1 = window;
            var w2 = outputPane.contentWindow;
            w2.$9 = w1.$9 = w1.$8;
            w2.$8 = w1.$8 = w1.$7;
            w2.$7 = w1.$7 = w1.$6;
            w2.$6 = w1.$6 = w1.$5;
            w2.$5 = w1.$5 = w1.$4;
            w2.$4 = w1.$4 = w1.$3;
            w2.$3 = w1.$3 = w1.$2;
            w2.$2 = w1.$2 = w1.$1;
            w2.$1 = w1.$1 = w1.$0;
            w2.$0 = w1.$0 = elm;
            w1.$0replacement = undefined;
        }
        // reset state
        this.watchValues = Object.create(null);
        this.watchDisplayValues = Object.create(null);
        this.hiddenAutoWatches = Object.create(null);
        // evalute the watches
        var w1 = window;
        var w2 = outputPane.contentWindow;
        for (var expr of [...tm.watches, ...vm.autoWatches]) {
            var result = '';
            if (expr && (w1.$0 || !~expr.indexOf("$0"))) {
                try {
                    result = w2.eval(expandShorthandsIn(expr));
                }
                catch (ex) {
                    result = '!!!' + (ex.message ? ex.message : `${ex}`);
                }
            }
            // output the current value
            vm.watchValues[expr] = result;
            vm.watchDisplayValues[expr] = `${result}`; // TODO
        }
        redrawIfReady();
    }
    // ===================================================
    // general dialog settings
    // ===================================================
    closeAllDialogs() {
        this.selectorGenerationDialog.isOpened$(false);
        this.searchDialog.isOpened$(false);
        this.welcomeDialog.isOpened$(false);
        this.settingsDialog.isOpened$(false);
    }
    /** Removes the user cookie */
    logOut() {
        document.cookie = 'user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        redrawIfReady();
    }
    /** Redirects to the login page */
    logIn() {
        location.href = '/login/github/start';
    }
    /** Refreshes the output frame with the latest source code */
    run() {
        // hide outdated element outline
        this.isPicking$(false);
        this.selectedElement$(null);
        if (window.jsPaneConsoleOutput) {
            window.jsPaneConsoleOutput.innerHTML = '';
        }
        // bail out if we don't have loaded yet
        if (!("outputPane" in window)) {
            setTimeout(x => this.run(), 100);
            return;
        }
        // remove any $ values since we are going to clear the inner document
        var w1 = window;
        var w2 = outputPane.contentWindow;
        w1.$0replacement = undefined;
        w1.$0 = w1.$1 = w1.$2 = w1.$3 = w1.$4 =
            w1.$5 = w1.$6 = w1.$7 = w1.$8 = w1.$9 = undefined;
        w2.$0 = w2.$1 = w2.$2 = w2.$3 = w2.$4 =
            w2.$5 = w2.$6 = w2.$7 = w2.$8 = w2.$9 = undefined;
        // TODO: try to match via sourceLine/tagName/id?
        for (var id of this.idMappings) {
            w2[id] = undefined;
        }
        this.idMappings.clear();
        // generate new document
        var d = outputPane.contentWindow.document;
        d.open();
        d.write("<!doctype html>");
        // prepare the console hooks
        outputPane.contentWindow.console.debug = function (...args) {
            args.forEach(arg => appendToConsole('-', arg));
            console.debug.apply(console, args);
        };
        outputPane.contentWindow.console.log = function (...args) {
            args.forEach(arg => appendToConsole('-', arg));
            console.log.apply(console, args);
        };
        outputPane.contentWindow.console.dir = function (...args) {
            args.forEach(arg => appendToConsole('-', arg));
            console.dir.apply(console, args);
        };
        outputPane.contentWindow.console.info = function (...args) {
            args.forEach(arg => appendToConsole('i', arg));
            console.info.apply(console, args);
        };
        outputPane.contentWindow.console.warn = function (...args) {
            args.forEach(arg => appendToConsole('!', arg));
            console.warn.apply(console, args);
        };
        outputPane.contentWindow.console.error = function (...args) {
            args.forEach(arg => appendToConsole('‼️', arg));
            console.error.apply(console, args);
        };
        // write the document content
        d.write("<title>" + tm.title.replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</title>");
        d.write("<script>" + tm.jsHead + "<" + "/script>");
        d.write("<style>" + tm.css + "</style>");
        attributeLines(0);
        var html = tm.html;
        var htmlLines = html.split("\n");
        for (var lineIndex = 0; lineIndex < htmlLines.length;) {
            d.writeln(htmlLines[lineIndex]);
            attributeLines(++lineIndex);
        }
        d.write("<script>" + tm.jsBody + "<" + "/script>");
        d.close();
        // reset the line mapping
        vm.lineMapping = htmlLines.map((l, i) => i);
        vm.lineMappingLineCount = htmlLines.length;
        // create short names for all elements without custom id
        attributeIds(this);
        // rerun the watches
        this.refreshWatches();
        //-------------------------------------------------------
        /** Detects newly inserted elements and note which html line generated them */
        function attributeLines(lineIndex) {
            for (var i = d.all.length; i--;) {
                if (d.all[i].sourceLine == undefined) {
                    d.all[i].sourceLine = lineIndex;
                }
                else {
                    break;
                }
            }
        }
        /** Creates global variables to easily access nodes without id */
        function attributeIds(vm) {
            var tagCounters = Object.create(null);
            for (var i = 0; ++i < d.all.length;) {
                var el = d.all[i];
                if (el.sourceLine > 0 && el != d.body) {
                    var tagCounter = tagCounters[el.tagName] = 1 + (tagCounters[el.tagName] | 0);
                    if (!el.id) {
                        var tagId = el.tagName.toLowerCase() + tagCounter;
                        if (!outputPane.contentWindow[tagId]) {
                            outputPane.contentWindow[tagId] = el;
                            el.sourceTagId = tagId;
                            vm.idMappings.add(tagId);
                            console.log(tagId, el);
                        }
                    }
                }
            }
        }
    }
    /** Saves the test in a json url */
    saveInUrl() {
        suspendRedrawsOn(redraw => {
            location.hash = "#/json:" + JSON.stringify(tmData);
            vm.currentTestId$(location.hash.substr(2));
        });
    }
    /** Saves the test model in the localStorage */
    saveLocally() {
        var data = tmData;
        var id = '';
        var idLetters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        for (var i = 5; i--;) {
            id += idLetters[Math.floor(Math.random() * idLetters.length)];
        }
        sessionStorage.setItem('local:save', 'local:' + id);
        localStorage.setItem('local:' + id, JSON.stringify(data));
        location.hash = "#/local:" + id;
    }
    /** Saves the test model on the server */
    saveOnline() {
        // ensure test case title:
        if (!tm.title || tm.title == "UntitledTest") {
            try {
                tm.title = prompt("Enter a title for your test", tm.title);
            }
            catch (ex) {
                // do nothing
            }
        }
        // ensure the user is connected
        if (!this.githubIsConnected$()) {
            this.saveLocally();
            alert(`You are about to be redirected to the login page. Your current work has been saved locally with id ${sessionStorage.getItem('local:save')}, and will be recovered after you log in.`);
            this.settingsDialog.logIn();
            return;
        }
        // upload the testcase data
        var data = tmData;
        fetch('/new/testcase/', {
            method: 'POST',
            body: JSON.stringify(data),
            credentials: "same-origin"
        }).then(r => r.json()).then(o => {
            sessionStorage.removeItem('local:save');
            suspendRedrawsOn(redraw => {
                // update the data
                this.currentTestId$(o.id);
                this.updateURL();
                // refresh the iframe and view
                this.run();
                // remove suspender
                redraw();
            });
        }).catch(ex => {
            console.error(ex);
            alert("Oops, something went wrong... Try again or save locally by pressing ALT when you click on the save button.");
        });
    }
    /** Resets the test model based on new data */
    openFromJSON(newData) {
        this.isLoading$(false);
        Object.assign(tmData, {
            title: 'UntitledTest',
            html: '',
            css: '',
            jsHead: '',
            jsBody: '',
            watches: []
        });
        if (newData) {
            Object.assign(tmData, newData);
        }
        this.updateURL();
        this.run();
    }
    /** Updates url and page title on test id change */
    updateURL() {
        updatePageTitle();
        location.hash = '#/' + vm.currentTestId$();
        history.replaceState(tmData, document.title, location.href); // TODO: clone
    }
    /** Exports the test into a web platform test */
    saveToFile() {
        var html = '';
        function ln(...args) { html += String.raw(...args) + '\n'; }
        ln `<!DOCTYPE html>`;
        // ensure test case title:
        if (!tm.title || tm.title == "UntitledTest") {
            try {
                tm.title = prompt("Enter a title for your test", tm.title);
            }
            catch (ex) {
                // do nothing
            }
        }
        if (tm.title) {
            ln `<title>${tm.title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>`;
        }
        else {
            ln `<title>UntitledTest</title>`;
        }
        // ensure test case harness:
        var pathToHarness = "/resources/";
        try {
            pathToHarness = prompt("Enter the path to the testharness folder", pathToHarness);
            if (pathToHarness && !/\/$/.test(pathToHarness)) {
                pathToHarness += '/';
            }
        }
        catch (ex) {
            // do nothing
        }
        ln `<script src="${pathToHarness}testharness.js"></script>`;
        ln `<script src="${pathToHarness}testharnessreport.js"></script>`;
        // append the test case itself
        if (tm.jsHead) {
            ln `<script>${"\n\n" + tm.jsHead + "\n\n"}</script>`;
        }
        if (tm.css) {
            ln `<style>${"\n\n" + tm.css + "\n\n"}</style>`;
        }
        if (tm.html) {
            ln ``;
            ln `${tm.html}`;
            ln ``;
        }
        if (tm.jsBody) {
            ln `<script>${"\n\n" + tm.jsBody + "\n\n"}</script>`;
        }
        ln `<script>
var test_description = document.title;
promise_test(
	t => {
		return new Promise(test => addEventListener('load', e=>test()))
		${Array.from(tm.watches).map(expr => ({
            expression: expr,
            jsValue: vm.watchValues[expr]
        })).filter(w => !!w.expression).map(w => `.then(test => assert_equals(${expandShorthandsIn(w.expression)}, ${JSON.stringify(w.jsValue)}, ${JSON.stringify(`Invalid ${w.expression};`)}))`).join('\n\t\t')}
	},
	test_description
);
</script>`;
        var blob = new Blob([html], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.setAttribute("download", "testcase.html");
        a.href = url;
        a.click();
        setTimeout(x => URL.revokeObjectURL(url), 10000);
    }
}
class SelectorGenerationDialogViewModel {
    constructor(vm) {
        /** The attached view model */
        this.vm = null;
        /** Whether the dialog is opened or closed */
        this.isOpened$ = m.prop(false);
        /** The raw watch expression we want to pin */
        this.watchExpression$ = m.prop("");
        /** Its precomputed value, in case one was given */
        this.watchValue$ = m.prop({ defined: false, value: undefined });
        /** The id auto-generated for the element, if any */
        this.autoId$ = m.prop("");
        /** Whether there is an auto-generated id (readonly) */
        this.isAutoAvailable$ = cachedCast(this.autoId$, x => !!x);
        /** The mode chosen by the user */
        this.chosenMode$ = m.prop("auto");
        /** The id the user typed in the text box (id mode) */
        this.chosenId$ = m.prop("");
        /** The selector the user typed in the text box (selector mode) */
        this.chosenSelector$ = m.prop("");
        this.vm = vm;
    }
}
class SettingsDialogViewModel {
    constructor(vm) {
        /** The attached view model */
        this.vm = null;
        /** Whether the dialog is opened or closed */
        this.isOpened$ = m.prop(false);
        /** Whether to use Monaco on this device or not */
        this.useMonaco$ = m.prop2((v) => !localStorage.getItem('noMonaco'), (v) => localStorage.setItem('noMonaco', v ? '' : 'true'));
        this.vm = vm;
    }
    /** Ask the viewmodel to log the user out */
    logOut() {
        this.vm.logOut();
    }
    /** Ask the viewmodel to log a user in */
    logIn() {
        this.vm.logIn();
    }
    /** Open the welcome dialog */
    openWelcomeDialog() {
        this.vm.welcomeDialog.isOpened$(true);
    }
    /** Open the search dialog */
    openSearchDialog() {
        this.vm.searchDialog.isOpened$(true);
    }
}
class WelcomeDialogViewModel {
    constructor(vm) {
        /** The attached view model */
        this.vm = null;
        /** Whether the dialog is opened or closed */
        this.isOpened$ = m.prop(false);
        this.vm = vm;
        if (location.hash == '' || location.hash == '#/new') {
            if (!localStorage.getItem('noWelcome') && !vm.githubIsConnected$()) {
                this.isOpened$(true);
            }
            else {
                localStorage.setItem('noWelcome', 'true');
            }
        }
        else {
            localStorage.setItem('noWelcome', 'true');
        }
    }
}
class SearchDialogViewModel {
    constructor(vm) {
        /** The attached view model */
        this.vm = null;
        /** Whether the dialog is opened or closed */
        this.isOpened$ = m.prop(false);
        /** Whether the dialog should get focus */
        this.shouldGetFocus$ = m.prop(false);
        /** The text that is being searched */
        this.searchTerms$ = m.prop("");
        /** The text that is being searched */
        this.searchUrl$ = m.prop("about:blank");
        this.vm = vm;
    }
    /** Opens the dialog */
    open() {
        if (!this.isOpened$()) {
            this.searchTerms$("");
            this.searchUrl$("about:blank");
            this.isOpened$(true);
        }
        this.shouldGetFocus$(true);
    }
}
var vm = new ViewModel();
/// <reference path="wptest-vm.tsx" />
var Input = new Tag().from(a => React.createElement("input", Object.assign({}, attributesOf(a), { value: a.value$(), oninput: bindTo(a.value$), onchange: bindTo(a.value$) })));
var InputCheckbox = new Tag().from(a => React.createElement("input", Object.assign({ type: "checkbox" }, attributesOf(a), { checked: a.value$(), onchange: bindTo(a.value$, "checked") })));
var InputRadio = new Tag().from(a => React.createElement("input", Object.assign({ type: "radio" }, attributesOf(a), { checked: a.checkedValue$() == a.value, onchange: bindTo(a.checkedValue$) })));
var TextArea = new Tag().from(a => React.createElement("textarea", Object.assign({}, attributesOf(a), { oninput: bindTo(a.value$), onchange: bindTo(a.value$) }), a.value$()));
var BodyToolbar = new Tag().from(a => React.createElement("body-toolbar", { row: true, role: "toolbar" },
    React.createElement("button", { onclick: e => vm.run(), title: "Move your code to the iframe" }, "Run"),
    React.createElement("button", { onclick: e => { if (e.shiftKey) {
            vm.saveInUrl();
        }
        else if (e.altKey) {
            vm.saveLocally();
        }
        else {
            vm.saveOnline();
        } }, title: "Save your test online (Shift: url, Alt: local storage)" }, "Save"),
    React.createElement("button", { onclick: e => vm.saveToFile(), title: "Download as a weplatform test case" }, "Export"),
    React.createElement("button", { onclick: e => vm.settingsDialog.isOpened$(true), title: "Open the settings dialog" }, "\u22C5\u22C5\u22C5"),
    React.createElement("hr", { style: "visibility: hidden; flex:1 0 0;" }),
    React.createElement(Input, { "value$": a.model.title$, title: "Title of your test case" })));
var MonacoTextEditor = new Tag().with({
    oncreate(node) {
        // set default state values
        this.editor = null;
        this.value = node.attrs.value$();
        this.isDirty = false;
        // wait for monaco to load if needed
        if (localStorage.getItem('noMonaco'))
            return;
        require(['vs/editor/editor.main'], then => {
            // create the text editor, and save it in the state
            this.value = node.attrs.value$();
            this.isDirty = false;
            let editor = this.editor = monaco.editor.create(document.getElementById(node.attrs.id + 'Area'), {
                value: this.value,
                fontSize: 13,
                lineNumbers: "off",
                scrollbar: {
                    useShadows: false,
                    verticalHasArrows: false,
                    horizontalHasArrows: false,
                    vertical: 'hidden',
                    horizontal: 'hidden',
                    verticalScrollbarSize: 0,
                    horizontalScrollbarSize: 0,
                    arrowSize: 0
                },
                language: node.attrs.language,
            });
            this.editor.updateOptions({
                acceptSuggestionOnEnter: false,
            });
            this.editor.getModel().updateOptions({
                insertSpaces: false,
                tabSize: 4,
            });
            // register to some events to potentially update the linked value
            this.editor.getModel().onDidChangeContent(e => {
                if (this.editor.isFocused()) {
                    this.isDirty = true;
                    redrawIfReady();
                }
            });
            // register to the window resize event, and relayout if needed
            window.addEventListener('resize', x => {
                this.editor.layout();
            });
            // hookup language-specific things
            switch (node.attrs.language) {
                case "html": {
                    this.editor.getModel().onDidChangeContent(e => {
                        var oldLineCount = 1 + e.range.endLineNumber - e.range.startLineNumber;
                        var newLineCount = countLines(e.text);
                        var deltaLineCount = (newLineCount - oldLineCount);
                        var totalLineCount = countLines(editor.getValue());
                        var newLineMapping = new Array(totalLineCount);
                        for (var x = 0; x < totalLineCount; x++) {
                            if (x < e.range.startLineNumber) {
                                newLineMapping[x] = crossMappingHelper(x);
                            }
                            else if (x < e.range.startLineNumber + newLineCount - 1) {
                                newLineMapping[x] = crossMappingHelper(e.range.startLineNumber - 1);
                            }
                            else {
                                newLineMapping[x] = crossMappingHelper(x - deltaLineCount);
                            }
                        }
                        vm.lineMapping = newLineMapping;
                        function countLines(txt) {
                            return txt.split(/\n/g).length;
                        }
                        function crossMappingHelper(x) {
                            if (x < vm.lineMapping.length) {
                                return vm.lineMapping[x];
                            }
                            else {
                                return vm.lineMappingLineCount - 1;
                            }
                        }
                    });
                    this.editor.addAction({
                        id: 'wpt-inspect',
                        label: 'Inspect this element',
                        contextMenuGroupId: 'navigation',
                        contextMenuOrder: 0,
                        run() {
                            var sourceLine = 1 + vm.lineMapping[editor.getPosition().lineNumber - 1];
                            var w = outputPane.contentWindow;
                            var d = outputPane.contentDocument;
                            for (var i = 0; i < d.all.length; i++) {
                                var elm = d.all[i];
                                if (elm.sourceLine == sourceLine && elm != d.body) {
                                    vm.selectedElement$(elm);
                                    vm.refreshWatches(elm);
                                    return;
                                }
                            }
                            vm.selectedElement$(undefined);
                            vm.refreshWatches();
                        }
                    });
                    break;
                }
                case "css": {
                    this.editor.addAction({
                        id: "lookup-on-csswg",
                        label: "Search on csswg.org",
                        contextMenuGroupId: 'navigation',
                        contextMenuOrder: 0,
                        run() {
                            var word = editor.getModel().getWordAtPosition(editor.getPosition()).word;
                            window.open("http://bing.com/search?q=" + word + " site:drafts.csswg.org");
                        }
                    });
                    this.editor.addAction({
                        id: "lookup-on-msdn",
                        label: "Search on MSDN",
                        contextMenuGroupId: 'navigation',
                        contextMenuOrder: 0.1,
                        run() {
                            var word = editor.getModel().getWordAtPosition(editor.getPosition()).word;
                            window.open("http://bing.com/search?q=" + word + " property site:msdn.microsoft.com");
                        }
                    });
                    this.editor.addAction({
                        id: "lookup-on-mdn",
                        label: "Search on MDN",
                        contextMenuGroupId: 'navigation',
                        contextMenuOrder: 0.2,
                        run() {
                            var word = editor.getModel().getWordAtPosition(editor.getPosition()).word;
                            window.open("http://bing.com/search?q=" + word + " css site:developer.mozilla.org ");
                        }
                    });
                    this.editor.addAction({
                        id: "cssbeautify",
                        label: "Beautify the code",
                        contextMenuGroupId: 'navigation',
                        contextMenuOrder: 0.3,
                        run() {
                            editor.setValue(cssbeautify(editor.getValue(), { indent: '\t' }));
                            editor.focus();
                        }
                    });
                    break;
                }
                case "javascript": {
                    // TODO
                    // Add the model of builtin functions?
                    // And of generated IDs?
                    break;
                }
            }
            // eventually recover current textbox focus state
            let linkedTextbox = document.getElementById(node.attrs.id + "Textbox");
            if (document.activeElement === linkedTextbox) {
                let startPos = linkedTextbox.selectionStart;
                let endPos = linkedTextbox.selectionEnd;
                if (startPos > 0 || endPos > 0) {
                    let startLine = 0, startPosInLine = startPos;
                    let endLine = 0, endPosInLine = endPos;
                    var lines = linkedTextbox.value.split(/\n/g);
                    while (startPosInLine > lines[startLine].length) {
                        startPosInLine -= lines[startLine].length + 1;
                        startLine++;
                    }
                    while (endPosInLine > lines[endLine].length) {
                        endPosInLine -= lines[endLine].length + 1;
                        endLine++;
                    }
                    this.editor.setSelection(new monaco.Range(1 + startLine, 1 + startPosInLine, 1 + endLine, 1 + endPosInLine));
                }
                this.editor.focus();
            }
            redrawIfReady();
        });
    },
    onbeforeupdate(node, oldn) {
        // verifies that we have a text control to work with
        if (!this.editor)
            return;
        // verifies whether we need to change the text of the control
        var theNewValue$ = node.attrs["value$"];
        var theNewValue = theNewValue$();
        var cantForciblyUpdate = () => (this.editor.isFocused()
            && this.value
            && theNewValue);
        if (theNewValue != this.value && !cantForciblyUpdate()) {
            // there was a model update
            this.isDirty = false;
            this.editor.setValue(this.value = theNewValue);
            // in this case, stop tracking the line mapping
            if (node.attrs.language === 'html') {
                vm.lineMapping = this.value.split(/\n/g).map(l => 0);
                vm.shouldMoveToSelectedElement$(false);
            }
        }
        else if (this.isDirty) {
            // there was a content update
            theNewValue$(this.value = this.editor.getValue());
            requestAnimationFrame(time => m.redraw());
        }
        else {
            // no update
        }
        // check whether we should move the cursor as requested by the view model
        if (vm.shouldMoveToSelectedElement$()) {
            vm.shouldMoveToSelectedElement$(false); // only one editor should take this
            var elm = vm.selectedElement$();
            var column = 0;
            try {
                column = this.editor.getValue().split(/\n/g)[elm.sourceLine - 1].match(/^\s+/)[0].length;
            }
            catch (ex) { }
            this.editor.revealLineInCenterIfOutsideViewport(elm.sourceLine);
            this.editor.setPosition({ lineNumber: elm.sourceLine, column: 1 + column });
            this.editor.focus();
        }
    }
}).from((a, c, s) => React.createElement("monaco-text-editor", { id: a.id, language: a.language },
    React.createElement("monaco-text-editor-area", { id: a.id + 'Area', style: "position:absolute;top:0;left:0;right:0;bottom:0;" }),
    React.createElement(TextArea, { id: a.id + 'Textbox', "value$": a.value$, hidden: !!s.editor, onkeydown: enableTabInTextarea, style: "appearance:none;background:transparent!important;border:none!important;padding:0;margin:0;position:absolute;top:0;left:10px;right:0;bottom:0;width:calc(100% - 10px);white-space:pre;font-family:'Consolas','Courier New',monospace;font-size:13px;line-height:1.4;color:black;tab-size:4;outline:none!important;" }),
    React.createElement("monaco-text-editor-placeholder", { hidden: a.value$().length > 0, style: "appearance:none;background:transparent;border:none;padding:0;margin:0;position:absolute;top:0;left:10px;right:0;bottom:0;white-space:pre;font-family:'Consolas','Courier New',monospace;font-size:13px;line-height:1.4;color:silver;pointer-events:none;overflow:hidden;" }, ({
        'javascript': '//<head>\n// HEAD CODE GOES HERE\n//</head>\n//\n// BODY CODE GOES HERE',
        'html': '<!--<table>\n    <tr>\n        <td>HTML CODE</td>\n        <td>GOES HERE</td>\n    </tr>\n</table>-->',
        'css': '/* CSS CODE GOES HERE         */\n/* table {                    */\n/*     border: 3px solid red; */\n/* }                          */'
    }[a.language] || ''))));
function enableTabInTextarea(e) {
    // tab but not ctrl+tab
    if (e.ctrlKey || e.altKey)
        return;
    if (e.keyCode == 9 || e.which == 9) {
        e.preventDefault();
        var s = this.selectionStart;
        this.value = this.value.substring(0, this.selectionStart) + "\t" + this.value.substring(this.selectionEnd);
        this.selectionStart = this.selectionEnd = s + 1;
        this.onchange(e);
    }
}
var TabButton = new Tag().from((a, c) => React.createElement("button", Object.assign({}, attributesOf(a), { onclick: e => a.activePane$(a.pane), "aria-controls": a.pane, "aria-expanded": `${a.pane == a.activePane$()}` }), c));
var ToolsPaneToolbar = new Tag().from(a => React.createElement("tools-pane-toolbar", { row: true, "aria-controls": a.activePane$(), role: "toolbar" },
    React.createElement(TabButton, { pane: "jsPaneWatches", "activePane$": a.activePane$ }, "Watches"),
    React.createElement(TabButton, { pane: "jsPaneConsole", "activePane$": a.activePane$ }, "Console"),
    React.createElement(TabButton, { pane: "jsPaneHeadCode", "activePane$": a.activePane$ }, "Header code"),
    React.createElement(TabButton, { pane: "jsPaneBodyCode", "activePane$": a.activePane$ }, "Body code")));
var ToolsPaneWatches = new Tag().from(a => React.createElement("tools-pane-watches", { block: true, id: a.id, "is-active-pane": a.activePane$() == a.id },
    React.createElement(Input, { class: "watch-filter-textbox", "value$": vm.watchFilterText$, onkeyup: e => { if (e.keyCode == 27) {
            vm.watchFilterText$('');
        } }, type: "text", required: true, placeholder: "🔎", title: "Filter the watch list" }),
    React.createElement("ul", { class: "watch-list" },
        React.createElement("li", null,
            React.createElement("input", { type: "checkbox", checked: true, disabled: true, title: "Uncheck to delete this watch" }),
            React.createElement("input", { type: "text", placeholder: "/* add new watch here */", onchange: e => { if (e.target.value) {
                    vm.addPinnedWatch(e.target.value);
                    e.target.value = '';
                    e.target.focus();
                } } }),
            React.createElement("output", null)),
        tm.watches.map((expr, i, a) => React.createElement("li", null,
            React.createElement("input", { type: "checkbox", checked: true, title: "Uncheck to delete this watch", onchange: e => { if (!e.target.checked) {
                    vm.removePinnedWatch(expr);
                    e.target.checked = true;
                } } }),
            React.createElement(Input, { type: "text", title: expr, "value$": m.prop2(x => expr, v => a[i] = v) }),
            React.createElement("output", null, `${vm.watchDisplayValues[expr] || ''}`)))),
    React.createElement("ul", { class: "watch-list" }, vm.autoWatches.map(expr => React.createElement("li", { hidden: vm.hiddenAutoWatches[expr] || !vm.watchFilter$().matches(expr) },
        React.createElement("input", { type: "checkbox", title: "Check to pin this watch", onchange: e => { if (e.target.checked) {
                vm.addPinnedWatch(expr);
                e.target.checked = false;
            } } }),
        React.createElement("input", { type: "text", readonly: true, title: expr, value: expr }),
        React.createElement("output", null, `${vm.watchDisplayValues[expr] || ''}`))))));
var ToolsPaneConsole = new Tag().with({
    oncreate() {
        this.history = [''];
        this.historyIndex = 0;
    },
    onsumbit(e) {
        try {
            var inp = e.target.querySelector('input');
            var expr = inp.value;
            inp.value = '';
            // update the expression history
            this.history[this.history.length - 1] = expr;
            this.historyIndex = this.history.push("") - 1;
            // append expression to console
            appendToConsole(">", new String(expr));
            // evaluate expression
            var res = undefined;
            try {
                res = outputPane.contentWindow.eval(expandShorthandsIn(expr));
            }
            catch (ex) {
                res = ex;
            }
            // append result to console
            appendToConsole("=", res);
        }
        catch (ex) {
            console.error(ex);
        }
        finally {
            e.preventDefault();
            return false;
        }
    },
    onkeypress(e) {
        var inp = e.target;
        if (e.key == 'Up' || e.key == 'ArrowUp') {
            if (this.historyIndex > 0)
                this.historyIndex--;
            inp.value = this.history[this.historyIndex];
        }
        else if (e.key == 'Down' || e.key == 'ArrowDown') {
            if (this.historyIndex < this.history.length - 1)
                this.historyIndex++;
            inp.value = this.history[this.historyIndex];
        }
        else if (this.historyIndex == this.history.length - 1) {
            this.history[this.historyIndex] = inp.value;
        }
        else {
            // nothing to do
        }
    }
}).from((a, c, self) => React.createElement("tools-pane-console", { id: a.id, "is-active-pane": a.activePane$() == a.id },
    React.createElement("pre", { id: a.id + "Output" }),
    React.createElement("form", { method: "POST", onsubmit: e => self.onsumbit(e) },
        React.createElement("input", { type: "text", onkeydown: e => self.onkeypress(e), oninput: e => self.onkeypress(e) }))));
var ToolsPaneCode = new Tag().from(a => React.createElement("tools-pane-code", { id: a.id, "is-active-pane": a.activePane$() == a.id },
    React.createElement(MonacoTextEditor, { id: a.id + '--editor', "value$": a.value$, language: "javascript" })) // TODO
);
var OutputPaneCover = new Tag().with({
    shouldBeHidden() {
        return !vm.isPicking$() && !vm.selectedElement$();
    },
    boxStyles$: cachedCast(vm.selectedElement$, elm => {
        var styles = {
            marginBox: {
                position: "absolute",
                transform: "translate(0, 0)",
                borderStyle: "solid",
                borderColor: "rgba(255,0,0,0.3)"
            },
            borderBox: {
                borderStyle: "solid",
                borderColor: "rgba(0,0,0,0.3)"
            },
            paddingBox: {
                borderStyle: "solid",
                borderColor: "rgba(0,0,0,0.4)",
                backgroundColor: "rgba(0,0,0,0.5)",
                backgroundClip: "padding-box"
            },
            contentBox: {}
        };
        if (elm) {
            var es = gCS(elm);
            // position
            styles.marginBox.display = 'block';
            styles.marginBox.top = `${gBCT(elm)}px`;
            styles.marginBox.left = `${gBCL(elm)}px`;
            // margin box
            var mt = parseInt(es.marginTop);
            var ml = parseInt(es.marginLeft);
            var mr = parseInt(es.marginRight);
            var mb = parseInt(es.marginBottom);
            styles.marginBox.transform = `translate(${-ml}px,${-mt}px)`;
            styles.marginBox.borderTopWidth = `${mt}px`;
            styles.marginBox.borderLeftWidth = `${ml}px`;
            styles.marginBox.borderRightWidth = `${mr}px`;
            styles.marginBox.borderBottomWidth = `${mb}px`;
            // border box
            var bt = parseInt(es.borderTopWidth);
            var bl = parseInt(es.borderLeftWidth);
            var br = parseInt(es.borderRightWidth);
            var bb = parseInt(es.borderBottomWidth);
            styles.borderBox.borderTopWidth = `${bt}px`;
            styles.borderBox.borderLeftWidth = `${bl}px`;
            styles.borderBox.borderRightWidth = `${br}px`;
            styles.borderBox.borderBottomWidth = `${bb}px`;
            // padding box
            var pt = parseInt(es.paddingTop);
            var pl = parseInt(es.paddingLeft);
            var pr = parseInt(es.paddingRight);
            var pb = parseInt(es.paddingBottom);
            styles.paddingBox.borderTopWidth = `${pt}px`;
            styles.paddingBox.borderLeftWidth = `${pl}px`;
            styles.paddingBox.borderRightWidth = `${pr}px`;
            styles.paddingBox.borderBottomWidth = `${pb}px`;
            // content box
            styles.contentBox.width = `${gBCW(elm) - pl - pr - bl - br}px`;
            styles.contentBox.height = `${gBCH(elm) - pt - pb - bt - bb}px`;
        }
        return styles;
    }),
    setCurrentElementFromClick(e) {
        var elm = outputPane.contentDocument.elementFromPoint(e.offsetX, e.offsetY);
        vm.selectedElement$(elm);
        if (e.type == 'pointerdown') {
            // stop picking on pointer down
            vm.isPicking$(false);
            // also, update the watches for this new element
            vm.refreshWatches(elm);
            if (elm.sourceLine) {
                vm.shouldMoveToSelectedElement$(true);
            }
        }
        // we kinda need a synchronous redraw to be reactive
        // TODO: optimize this in another way?
        m.redraw(true);
    }
}).from((a, c, self) => React.createElement("output-pane-cover", { block: true, id: a.id, onpointermove: self.shouldBeHidden() ? null : e => self.setCurrentElementFromClick(e), onpointerdown: self.shouldBeHidden() ? null : e => self.setCurrentElementFromClick(e), "is-active": vm.isPicking$() },
    React.createElement("margin-box", { block: true, hidden: self.shouldBeHidden(), style: self.boxStyles$().marginBox },
        React.createElement("border-box", { block: true, style: self.boxStyles$().borderBox },
            React.createElement("padding-box", { block: true, style: self.boxStyles$().paddingBox },
                React.createElement("content-box", { block: true, style: self.boxStyles$().contentBox }))))));
var HTMLPane = new Tag().from(a => React.createElement("html-pane", { "disabled-style": { 'flex-grow': tm.html ? 3 : 1 } },
    React.createElement(MonacoTextEditor, { id: "htmlPaneEditor", "value$": tm.html$, language: "html" })));
var CSSPane = new Tag().from(a => React.createElement("css-pane", { "disabled-style": { 'flex-grow': tm.css ? 3 : 1 } },
    React.createElement(MonacoTextEditor, { id: "cssPaneEditor", "value$": tm.css$, language: "css" })));
var JSPane = new Tag().from(a => React.createElement("js-pane", { "disabled-style": { 'flex-grow': tm.jsBody ? 3 : 1 } },
    React.createElement(MonacoTextEditor, { id: "jsPaneEditor", "value$": vm.jsCombined$, language: "javascript" })));
var ToolsPane = new Tag().from(a => React.createElement("tools-pane", null,
    React.createElement(ToolsPaneToolbar, { "activePane$": vm.activeJsTab$ }),
    React.createElement("tools-pane-tabs", null,
        React.createElement(ToolsPaneWatches, { id: "jsPaneWatches", "activePane$": vm.activeJsTab$ }),
        React.createElement(ToolsPaneConsole, { id: "jsPaneConsole", "activePane$": vm.activeJsTab$ }),
        React.createElement(ToolsPaneCode, { id: "jsPaneHeadCode", "value$": tm.jsHead$, "activePane$": vm.activeJsTab$ }),
        React.createElement(ToolsPaneCode, { id: "jsPaneBodyCode", "value$": tm.jsBody$, "activePane$": vm.activeJsTab$ }))));
var OutputPane = new Tag().from(a => React.createElement("output-pane", null,
    React.createElement("iframe", { id: "outputPane", src: "about:blank", border: "0", frameborder: "0", "is-active": !vm.isPicking$() }),
    React.createElement(OutputPaneCover, { id: "outputPaneCover" }),
    React.createElement("output-pane-toolbar", { role: "toolbar" },
        React.createElement("button", { onclick: e => vm.isPicking$(!vm.isPicking$()) }, "\u22B3"),
        React.createElement("button", { onclick: e => vm.refreshWatches() }, "\u21BB"))));
var SelectorGenerationDialog = new Tag().with({
    generateReplacement() {
        var form = vm.selectorGenerationDialog;
        var w1 = window;
        // create the requested replacement, if possible
        switch (form.chosenMode$()) {
            case "auto": {
                w1.$0replacement = w1.$0.sourceTagId;
                break;
            }
            case "id": {
                if (form.chosenId$()) {
                    // assign the id to the element if we can
                    if (w1.$0 && w1.$0.sourceLine >= 1) {
                        var txt = '^(.|\r)*?';
                        var line = vm.lineMapping[w1.$0.sourceLine - 1];
                        for (var i = line; i--;) {
                            txt += '\\n(.|\r)*?';
                        }
                        txt += '\\<' + w1.$0.tagName + '\\b';
                        var reg = new RegExp(txt, 'i');
                        tm.html = tm.html.replace(reg, '$& id="' + form.chosenId$() + '"');
                        vm.run();
                    }
                    // then return the value
                    w1.$0replacement = `$(${JSON.stringify('#' + form.chosenId$())})`;
                }
                break;
            }
            case "selector": {
                if (form.chosenSelector$()) {
                    w1.$0replacement = `$(${JSON.stringify(form.chosenSelector$())})`;
                }
                break;
            }
        }
        form.isOpened$(false);
        if (form.watchValue$().defined) {
            vm.addPinnedWatch(form.watchExpression$(), form.watchValue$().value);
        }
        else {
            vm.addPinnedWatch(form.watchExpression$());
        }
    }
}).from((a, s, self) => React.createElement("dialog", { as: "selector-generation-dialog", autofocus: true, hidden: !vm.selectorGenerationDialog.isOpened$() },
    React.createElement("section", { tabindex: "-1" },
        React.createElement("h1", null, "How do you want to do this?"),
        React.createElement("form", { action: "POST", onsubmit: e => { e.preventDefault(); self.generateReplacement(); } },
            React.createElement("label", { hidden: !vm.selectorGenerationDialog.isAutoAvailable$(), style: "display: block; margin-bottom: 10px" },
                React.createElement(InputRadio, { name: "chosenMode", value: "auto", "checkedValue$": vm.selectorGenerationDialog.chosenMode$ }),
                "Use the source index"),
            React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                React.createElement(InputRadio, { name: "chosenMode", value: "id", "checkedValue$": vm.selectorGenerationDialog.chosenMode$ }),
                "Assign an id the the element",
                React.createElement(Input, { type: "text", "value$": vm.selectorGenerationDialog.chosenId$, onfocus: e => vm.selectorGenerationDialog.chosenMode$('id') })),
            React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                React.createElement(InputRadio, { name: "chosenMode", value: "selector", "checkedValue$": vm.selectorGenerationDialog.chosenMode$ }),
                "Use a css selector",
                React.createElement(Input, { type: "text", "value$": vm.selectorGenerationDialog.chosenSelector$, onfocus: e => vm.selectorGenerationDialog.chosenMode$('selector') })),
            React.createElement("footer", { style: "margin-top: 20px" },
                React.createElement("input", { type: "submit", value: "OK" }),
                "\u00A0",
                React.createElement("input", { type: "button", value: "Cancel", onclick: e => vm.selectorGenerationDialog.isOpened$(false) }))))));
var SettingsDialog = new Tag().with({
    close() {
        var form = vm.settingsDialog;
        form.isOpened$(false);
    }
}).from((a, s, self) => React.createElement("dialog", { as: "settings-dialog", autofocus: true, hidden: !vm.settingsDialog.isOpened$() },
    React.createElement("section", { tabindex: "-1" },
        React.createElement("h1", null, "Settings"),
        React.createElement("form", { action: "POST", onsubmit: e => { e.preventDefault(); self.close(); } },
            React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                React.createElement("button", { onclick: e => vm.settingsDialog.openWelcomeDialog() },
                    React.createElement("span", { class: "icon" }, "\uD83D\uDEC8"),
                    "Open the welcome screen")),
            React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                React.createElement("button", { onclick: e => vm.settingsDialog.openSearchDialog() },
                    React.createElement("span", { class: "icon" }, "\uD83D\uDD0E"),
                    "Search existing test cases")),
            React.createElement("hr", null),
            React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                React.createElement("button", { hidden: vm.githubIsConnected$(), onclick: e => vm.settingsDialog.logIn() },
                    React.createElement("span", { class: "icon" }, "\uD83D\uDD12"),
                    "Log In using your Github account"),
                React.createElement("button", { hidden: !vm.githubIsConnected$(), onclick: e => vm.settingsDialog.logOut() },
                    React.createElement("span", { class: "icon" }, "\uD83D\uDD12"),
                    "Log Out of your Github account (",
                    vm.githubUserName$(),
                    ")")),
            React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                React.createElement("button", { hidden: !vm.settingsDialog.useMonaco$(), onclick: e => vm.settingsDialog.useMonaco$(false), style: "display: block" },
                    React.createElement("span", { class: "icon" }, "\u2699"),
                    "Disable the advanced text editor on this device from now on"),
                React.createElement("button", { hidden: vm.settingsDialog.useMonaco$(), onclick: e => vm.settingsDialog.useMonaco$(true), style: "display: block" },
                    React.createElement("span", { class: "icon" }, "\u2699"),
                    "Enable the advanced text editor on this device from now on")),
            React.createElement("footer", { style: "margin-top: 20px" },
                React.createElement("input", { type: "submit", value: "Close" }))))));
var SearchDialog = new Tag().with({
    search() {
        var form = vm.searchDialog;
        form.searchUrl$('/search?q=' + encodeURIComponent(form.searchTerms$()) + '&time=' + Date.now());
    },
    close() {
        var form = vm.searchDialog;
        form.isOpened$(false);
    },
    onupdate() {
        var form = vm.searchDialog;
        if (this.wasOpened != form.isOpened$()) {
            if (this.wasOpened) {
                // TODO: close
            }
            else {
                // TODO: open
            }
        }
    }
}).from((a, s, self) => React.createElement("dialog", { as: "search-dialog", autofocus: true, hidden: !vm.searchDialog.isOpened$() },
    React.createElement("section", { tabindex: "-1", role: "search", style: "width: 80%; width: 80vw" },
        React.createElement("h1", null, "Search testcases"),
        React.createElement("form", { action: "POST", onsubmit: e => { e.preventDefault(); self.search(); } },
            React.createElement("p", { style: "font-size: 10px" }, "Search terms are separated by spaces, and must all match for the result to be returned; You can use the --html --css --js --author modifiers to narrow down the search. Out of these, only --author considers its arguments as alternatives."),
            React.createElement("p", { style: "font-size: 10px; color: green;" }, "Example: \"table --css border hidden --author FremyCompany gregwhitworth\" will return all test cases containing \"table\" in any code field, containing both border & hidden in their css code, and that have been written by FremyCompany or gregwhitworth."),
            React.createElement("div", { style: "display: flex;" },
                React.createElement(Input, { placeholder: "search terms here", "value$": vm.searchDialog.searchTerms$, style: "flex: 1 0 0" }),
                React.createElement("input", { type: "submit", value: "Search" })),
            React.createElement("iframe", { frameborder: "0", border: "0", src: vm.searchDialog.searchUrl$() }),
            React.createElement("footer", { style: "margin-top: 5px" },
                React.createElement("input", { type: "button", onclick: e => self.close(), value: "Close" }))))));
var WelcomeDialog = new Tag().with({
    close() {
        var form = vm.welcomeDialog;
        localStorage.setItem('noWelcome', 'true');
        form.isOpened$(false);
    }
}).from((a, s, self) => React.createElement("dialog", { as: "welcome-dialog", autofocus: true, hidden: !vm.welcomeDialog.isOpened$() },
    React.createElement("section", { tabindex: "-1" },
        React.createElement("h1", null, "The Web Platform Test Center"),
        React.createElement("form", { action: "POST", onsubmit: e => { e.preventDefault(); self.close(); } },
            React.createElement("p", null, "This websites provides tools to simplify the creation of reduced web platform test cases and the search of previously-written test cases."),
            React.createElement("p", null, "It is primarily addressed at engineers who build web browsers, and web developers who want to help bugs getting fixed by filing reduced issues on existing browsers."),
            React.createElement("footer", { style: "margin-top: 20px" },
                React.createElement("input", { type: "submit", value: " Got it! " }))))));
var TestEditorView = new Tag().from(a => {
    // if the page moved to a new id 
    // then we need to reset all data and download the new test
    if (a.id != vm.currentTestId$() && (a.id == location.hash.substr(2) || (a.id.substr(0, 5) == 'json:' && location.hash.substr(0, 7) == '#/json:'))) {
        vm.currentTestId$(a.id);
        vm.closeAllDialogs();
        if (a.id.indexOf('local:') == 0) {
            // local tests are loaded from localStorage
            var id = a.id;
            if (sessionStorage.getItem(id)) {
                id = sessionStorage.getItem(id);
                vm.currentTestId$(id);
                vm.updateURL();
            }
            vm.openFromJSON(JSON.parse(localStorage.getItem(id)));
            // when we recover the local:save test, we should offer to save online
            if (a.id == 'local:save' && vm.githubIsConnected$()) {
                setTimeout(function () {
                    if (confirm(`Welcome back, ${vm.githubUserName$()}! Should we save your test online now?`)) {
                        vm.saveOnline();
                    }
                }, 32);
            }
        }
        else if (a.id.indexOf('json:') == 0) {
            vm.openFromJSON(JSON.parse(decodeURIComponent(location.hash.substr('#/json:'.length))));
        }
        else if (a.id && a.id != 'new') {
            vm.isLoading$(true);
            vm.openFromJSON(null);
            fetch('/uploads/' + a.id + '.json').then(r => r.json()).then(d => {
                vm.openFromJSON(d);
            });
        }
    }
    // in all cases, we return the same markup though to avoid trashing
    return (React.createElement("body", null,
        React.createElement(BodyToolbar, { model: tm }),
        React.createElement("top-row", { row: true },
            React.createElement(HTMLPane, null),
            React.createElement(CSSPane, null),
            React.createElement(JSPane, null)),
        React.createElement("bottom-row", { row: true },
            React.createElement(OutputPane, null),
            React.createElement(ToolsPane, null)),
        React.createElement(SelectorGenerationDialog, null),
        React.createElement(SettingsDialog, null),
        React.createElement(SearchDialog, null),
        React.createElement(WelcomeDialog, null))).children;
});
m.route(document.body, '/new', { '/:id...': TestEditorView() });
//----------------------------------------------------------------
setInterval(updatePageTitle, 3000);
function updatePageTitle() {
    var titlePart = '';
    var urlPart = '';
    var id = vm.currentTestId$();
    if (id && id != 'new') {
        urlPart = 'wptest.center/#/' + id;
    }
    else {
        urlPart = 'wptest.center';
    }
    if (tm.title && tm.title != 'UntitledTest') {
        titlePart = tm.title + ' - ';
    }
    document.title = titlePart + urlPart;
}

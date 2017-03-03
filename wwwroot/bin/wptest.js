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
var rAF = window.requestAnimationFrame.bind(window);
var describe = function (node) {
    return node.nodeName + (node.id ? `#${node.id}` : '') + (node.classList.length ? `.${node.classList[0]}` : '');
};
///
/// This file contains mithril extensions to build my own framework
///
/// <reference path="monaco.d.ts" />
/// <reference path="wptest-helpers.tsx" />
m.route.prefix('#');
m.prop = function (cv) {
    return function (nv) {
        if (arguments.length >= 1) {
            if (cv !== nv) {
                cv = nv;
                m.redraw();
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
            Object.defineProperty(r, key, { get() { return o[key]; }, set(v) { o[key] = v; m.redraw(); } });
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
/** The helpers to inject in the iframe on reload (legacy code only) */
var jsHelpers = {
    textContent: `
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

	var rAF = window.requestAnimationFrame.bind(window);

	var describe = function(node) { 
		return node.nodeName + (node.id ? '#' + node.id : '') + (node.classList.length ? '.' + node.classList[0] : '');
	}
`
};
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
            "gBCW($0)",
            "gBCH($0)",
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
        this.selectorGenerationDialog = new SelectorGenerationDialogViewModel();
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
                dialog.chosenSelector$(describe(w1.$0));
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
        m.redraw();
    }
    /** Removes an expression from the list of watches */
    removePinnedWatch(expr) {
        var index = tm.watches.indexOf(expr);
        if (index >= 0) {
            tm.watches.splice(index, 1);
        }
        m.redraw();
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
                    result = w2.eval(expr);
                }
                catch (ex) {
                    result = '!!!' + (ex.message ? ex.message : `${ex}`);
                }
            }
            // output the current value
            vm.watchValues[expr] = result;
            vm.watchDisplayValues[expr] = `${result}`; // TODO
        }
        m.redraw();
    }
    /** Refreshes the output frame with the latest source code */
    run() {
        // hide outdated element outline
        this.isPicking$(false);
        this.selectedElement$(null);
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
        outputPane.contentWindow.console.log = function (...args) {
            args.forEach(arg => jsPaneConsole.innerText += `${arg}\n`); // TODO: fix unsafe here
            console.log.apply(console, args);
        };
        // write the document content
        d.write("<title>" + tm.title.replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</title>");
        d.write("<script>" + jsHelpers.textContent + "<" + "/script>"); // TODO: stop using this and do an actual replace
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
    /** Saves the test model in the localStorage */
    saveLocally() {
        var data = tmData;
        var id = '';
        var idLetters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        for (var i = 5; i--;) {
            id += idLetters[Math.floor(Math.random() * idLetters.length)];
        }
        localStorage.setItem('local:' + id, JSON.stringify(data));
        location.hash = "#/local:" + id;
    }
    /** Saves the test model on the server */
    saveOnline() {
        var data = tmData;
        fetch('/new/testcase/', {
            method: 'POST',
            body: JSON.stringify(data)
        }).then(r => r.json()).then(o => {
            this.currentTestId$(o.id);
            this.updateURL();
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
        ln `<script>${jsHelpers.textContent}</script>`; // TODO: inline this
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
		return new Promise(test => window.addEventListener('load', e=>test()))
		${Array.from(tm.watches).map(expr => ({
            expression: expr,
            jsValue: vm.watchValues[expr]
        })).filter(w => !!w.expression).map(w => `.then(test => assert_equals(${w.expression}, ${JSON.stringify(w.jsValue)}, ${JSON.stringify(`Invalid ${w.expression};`)}))`).join('\n\t\t\t')}
	},
	test_description
);
</script>`;
        // TODO: allow to save as a file
        console.log(html);
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
    constructor() {
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
    }
}
var vm = new ViewModel();
/// <reference path="wptest-vm.tsx" />
var Input = new Tag().from(a => React.createElement("input", Object.assign({}, attributesOf(a), { value: a.value$(), oninput: bindTo(a.value$), onchange: bindTo(a.value$) })));
var InputCheckbox = new Tag().from(a => React.createElement("input", Object.assign({ type: "checkbox" }, attributesOf(a), { checked: a.value$(), onchange: bindTo(a.value$, "checked") })));
var InputRadio = new Tag().from(a => React.createElement("input", Object.assign({ type: "radio" }, attributesOf(a), { checked: a.checkedValue$() == a.value, onchange: bindTo(a.checkedValue$) })));
var BodyToolbar = new Tag().from(a => React.createElement("body-toolbar", { row: true, role: "toolbar" },
    React.createElement("button", { onclick: e => vm.run(), title: "Move your code to the iframe" }, "Run"),
    React.createElement("button", { onclick: e => { if (e.altKey) {
            vm.saveLocally();
        }
        else {
            vm.saveOnline();
        } }, title: "Save online, or locally if you maintain Alt pressed" }, "Save"),
    React.createElement("button", { onclick: e => vm.saveToFile(), title: "Download as a weplatform test case" }, "Export"),
    React.createElement("hr", { style: "visibility: hidden; flex:1 0 0;" }),
    React.createElement(Input, { "value$": a.model.title$, title: "Title of your test case" })));
var MonacoTextEditor = new Tag().with({
    oncreate(node) {
        // set default state values
        this.editor = null;
        this.value = node.attrs.value$();
        this.isDirty = false;
        // wait for monaco to load if needed
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
                    m.redraw(true);
                    m.redraw();
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
        });
    },
    onbeforeupdate(node, oldn) {
        // verifies that we have a text control to work with
        if (!this.editor)
            return false;
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
        // this control never needs to be updated by mithril
        return false;
    }
}).from((a, c, s) => React.createElement("monaco-text-editor", { id: a.id, language: a.language },
    React.createElement("monaco-text-editor-area", { id: a.id + 'Area', style: "position:absolute;top:0;left:0;right:0;bottom:0;" })));
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
            React.createElement(Input, { type: "text", "value$": m.prop2(x => expr, v => a[i] = v) }),
            React.createElement("output", null, `${vm.watchDisplayValues[expr] || ''}`)))),
    React.createElement("ul", { class: "watch-list" }, vm.autoWatches.map(expr => React.createElement("li", { hidden: vm.hiddenAutoWatches[expr] || !vm.watchFilter$().matches(expr) },
        React.createElement("input", { type: "checkbox", title: "Check to pin this watch", onchange: e => { if (e.target.checked) {
                vm.addPinnedWatch(expr);
                e.target.checked = false;
            } } }),
        React.createElement("input", { type: "text", readonly: true, value: expr }),
        React.createElement("output", null, `${vm.watchDisplayValues[expr] || ''}`))))));
var ToolsPaneConsole = new Tag().from(a => React.createElement("tools-pane-console", { id: a.id, "is-active-pane": a.activePane$() == a.id }) // TODO
);
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
}).from((a, s, self) => React.createElement("dialog", { as: "selector-generation-dialog", hidden: !vm.selectorGenerationDialog.isOpened$() },
    React.createElement("section", { tabindex: "-1" },
        React.createElement("h1", null, "How do you want to do this?"),
        React.createElement("form", { action: "POST", onsubmit: e => { e.preventDefault(); self.generateReplacement(); } },
            React.createElement("label", { hidden: !vm.selectorGenerationDialog.isAutoAvailable$(), style: "display: block; margin-bottom: 10px" },
                React.createElement(InputRadio, { name: "chosenMode", value: "auto", "checkedValue$": vm.selectorGenerationDialog.chosenMode$ }),
                "Use the source index"),
            React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                React.createElement(InputRadio, { name: "chosenMode", value: "id", "checkedValue$": vm.selectorGenerationDialog.chosenMode$ }),
                "Assign an id the the element",
                React.createElement(Input, { "value$": vm.selectorGenerationDialog.chosenId$, onfocus: e => vm.selectorGenerationDialog.chosenMode$('id') })),
            React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                React.createElement(InputRadio, { name: "chosenMode", value: "selector", "checkedValue$": vm.selectorGenerationDialog.chosenMode$ }),
                "Use a css selector",
                React.createElement(Input, { "value$": vm.selectorGenerationDialog.chosenSelector$, onfocus: e => vm.selectorGenerationDialog.chosenMode$('selector') })),
            React.createElement("input", { type: "submit", value: "OK" }),
            React.createElement("input", { type: "button", value: "Cancel", onclick: e => vm.selectorGenerationDialog.isOpened$(false) })))));
var TestEditorView = new Tag().from(a => {
    // if the page moved to a new id 
    // then we need to reset all data and download the new test
    if (a.id != vm.currentTestId$()) {
        vm.currentTestId$(a.id);
        if (a.id.indexOf('local:') == 0) {
            vm.openFromJSON(JSON.parse(localStorage.getItem(a.id)));
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
        React.createElement(SelectorGenerationDialog, null))).children;
});
m.route(document.body, '/new', { '/:id': TestEditorView() });
//----------------------------------------------------------------
setInterval(updatePageTitle, 3000);
function updatePageTitle() {
    var titlePart = '';
    var urlPart = '';
    if (tm.id && tm.id != 'new') {
        urlPart = 'wptest.center/#/' + tm.id;
    }
    else {
        urlPart = 'wptest.center';
    }
    if (tm.title && tm.title != 'UntitledTest') {
        titlePart = tm.title + ' - ';
    }
    document.title = titlePart + urlPart;
}

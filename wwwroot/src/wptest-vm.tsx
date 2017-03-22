///
/// This file contains the view model of the application
///
/// <reference path="lib/wptest-framework.tsx" />
/// <reference path="lib/model.d.ts" />

/** The iframe in which vm.run() writes */
declare var outputPane : HTMLIFrameElement;

/** The console pane (legacy code only) */
interface Window { jsPaneConsoleOutput?: HTMLPreElement }
function appendToConsole(logo, content) {
	var jsPaneConsoleOutput = window.jsPaneConsoleOutput;
	if(jsPaneConsoleOutput) {
		var textContent = convertObjectToDescription(content);
		var logoSpan = document.createElement("span"); {
			logoSpan.textContent = `${logo} `;
		}
		var contentSpan = document.createElement("span"); {
			contentSpan.textContent = textContent;
		}
		var entry = document.createElement("div"); {
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
function expandShorthandsIn(jsCode: string): string {
	return (

		jsCode

		.replace(/\b\$\(/g,'document.querySelector(')
		.replace(/\b\$\b/g,'document.querySelector.bind(document)')
		.replace(/\b\$$\(/g,'document.querySelectorAll(')
		.replace(/\b\$$\b/g,'document.querySelectorAll.bind(document)')
		.replace(/\beFP\(/g,'document.elementFromPoint(')
		.replace(/\beFP\b/g,'document.elementFromPoint.bind(document)')

		.replace(/\bgCS\(/g,'getComputedStyle(')
		.replace(/\bgCS\b/g,'getComputedStyle.bind(window)')
		.replace(/\brAF\(/g,'requestAnimationFrame(')
		.replace(/\brAF\b/g,'requestAnimationFrame.bind(window)')

		.replace(/\.gBCW\(\)/g,'.getBoundingClientRect().width')
		.replace(/\.gBCH\(\)/g,'.getBoundingClientRect().height')
		.replace(/\.gBCL\(\)/g,'.getBoundingClientRect().left')
		.replace(/\.gBCT\(\)/g,'.getBoundingClientRect().top')
		.replace(/\.gBCR\(\)/g,'.getBoundingClientRect().right')
		.replace(/\.gBCB\(\)/g,'.getBoundingClientRect().bottom')

		.replace(/\bdescribe\(/g,"(node => node.nodeName + (node.id ? '#' + node.id : '') + (node.classList.length ? '.' + node.classList[0] : ''))(")

	);
}

/** The data of the test being writter (as JSON) */
var tmData = {
	id: undefined,
	title: "UntitledTest",
	html: "",
	css: "",
	jsBody: "",
	jsHead: "",
	watches: [ ]
} as TestDataModel;

/** The data of the test being written (as ViewModel) */
var tm = m.addProps<TestDataModel,TestModel>(tmData);

/** The data used to represent the current state of the view */
class ViewModel {

	// ===================================================
	// github state (readonly)
	// ===================================================

	githubUserData$ = cachedCast(() => document.cookie, cookie => {
		// read data from the user cookie (and trust it)
		var userCookie = decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent('user').replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || 'null'
		// parse that data into an object
		var user = null; try { user = JSON.parse(userCookie.substr(2,userCookie.length - 46)); } catch (ex) {};
		// return the result
		return user as {
			id: string | number,
			username: string,
			email: string,
			[propertyName: string]: any
		}
	})

	githubIsConnected$ = cachedCast(this.githubUserData$, user => !!user)
	githubUserName$ = cachedCast(this.githubUserData$, user => user ? user.username : "anonymous")
	githubUserId$ = cachedCast(this.githubUserData$, user => user ? user.id : null)
	githubUserEmail$ = cachedCast(this.githubUserData$, user => user ? user.email : null)

	// ===================================================
	// editor settings
	// ===================================================
	
	/** The id of the currently edited test */
	currentTestId$ = m.prop("new")

	/** The combined jsHead and jsBody */
	jsCombined$ = function(v?:string) {
		if(arguments.length == 0) {
			var jsHead = tm.jsHead;
			var jsBody = tm.jsBody;
			if(jsHead) {
				jsBody = '//<head>\r\n' + jsHead + '\r\n//</head>\r\n' + jsBody;
			}
			return jsBody;
		} else {
			var jsHead = '';
			var jsBody = v;
			jsBody = jsBody.replace(/^\/\/<head>\r\n((.|\r|\n)*)\r\n\/\/<\/head>\r\n/,function(m,code) {
				jsHead = code;
				return '';
			})
			tm.jsHead = jsHead;
			tm.jsBody = jsBody;
		}
	} as Prop<string>
	

	// ===================================================
	// jsPane settings
	// ===================================================
	
	/** The id of the currently active tab */
	activeJsTab$ = m.prop('jsPaneWatches')
	

	// ===================================================
	// watch settings
	// ===================================================

	/** The readonly watches for the selected element */
	autoWatches = [
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

	})())

	/** Cache of the values of the watches (as js object) */
	watchValues = Object.create(null) as { [key:string]: any }

	/** Cache of the values of the watches (as string) */
	watchDisplayValues = Object.create(null) as { [key:string]: string }

	/** Special flag map of watches to hide (because they have been pinned) */
	hiddenAutoWatches = Object.create(null) as { [key:string]: boolean }

	/** The text currently used as display-filter input for the watches */
	watchFilterText$ = m.prop<string>("")

	/** The actual test used as display-filter for the watches (readonly) */
	watchFilter$ = cachedCast(() => this.watchFilterText$(), (filterText:string) => {

		// if no text in the search box, every watch matches
		var isTextMatching = (expr:string) => true;

		// convert the text into a matcher
		if(filterText.length > 0) {

			// normal case = indexOf search
			var filterTextLC = filterText.toLowerCase();
			isTextMatching = expr => !!~expr.toLowerCase().indexOf(filterTextLC);

			// special case if regexp is typed
			if(filterText.indexOf('/') == 0) {
				var reg = null as RegExp;
				try { reg = reg || eval(filterText); } catch (ex) {}
				try { reg = reg || eval(filterText+'/i') } catch (ex) {}
				if(reg instanceof RegExp) {
					isTextMatching = expr => reg.test(expr);
				}
			}
		}

		// return the matcher
		return { matches: isTextMatching };

	})

	/** Adds an expression to the list of watches (eventually bootstrapped with a value) */
	addPinnedWatch(expr:string,value?) {

		// check that we have a base on which pinning this expression makes sense
		var processedExpression = expr;
		if(~expr.indexOf("$0")) {
			var w1 = window as any;
			if(!w1.$0) {
				// cannot pin an auto watch when no element is on the stack
				return;
			} else if(w1.$0replacement||w1.$0.id) {
				// we already know how to replace $0 by a stable expression
				processedExpression = processedExpression.replace(/\$0/g, w1.$0replacement||w1.$0.id);
			} else {
				// we need to show the dialog before replacing $0 by $0replacement
				var dialog = this.selectorGenerationDialog;
				dialog.watchExpression$(expr);
				dialog.watchValue$({ defined: arguments.length >= 2, value: value });
				dialog.autoId$(w1.$0.sourceTagId||'');
				dialog.chosenMode$(w1.$0.sourceTagId ? 'auto' : 'selector')
				dialog.chosenId$(w1.$0.sourceTagId||'');
				dialog.chosenSelector$(buildSelectorFor(w1.$0));
				dialog.isOpened$(true);
				return;
			}
		}

		// actually pin this expresion now that the safety checks have run
		tm.watches.push(processedExpression);
		if(arguments.length >= 2) {

			// a value was provided for us, let's use it
			vm.watchValues[processedExpression] = value;
			vm.watchDisplayValues[processedExpression] = `${value}`; // TODO

		} else if(expr in vm.watchValues) {

			// we just pinned some auto watch
			vm.watchValues[processedExpression] = vm.watchValues[expr];
			vm.watchDisplayValues[processedExpression] = vm.watchDisplayValues[expr];
			vm.hiddenAutoWatches[expr] = true;

		} else {

			// we have no recollection of this watch, recompute everything
			vm.refreshWatches();

		}
		redrawIfReady();
	}

	/** Removes an expression from the list of watches */
	removePinnedWatch(expr:string) {
		var index = tm.watches.indexOf(expr);
		if(index >= 0) {
			tm.watches.splice(index,1);
		}
		redrawIfReady();
	}

	/** Recomputes the values and display values of watches */
	refreshWatches(elm?: Element) {

		// possibly push elm on the stack of selected elements
		if(elm) {
			var w1 = window as any;
			var w2 = outputPane.contentWindow as any;
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
		this.watchValues = Object.create(null) as any;
		this.watchDisplayValues = Object.create(null) as any;
		this.hiddenAutoWatches = Object.create(null) as any;

		// evalute the watches
		var w1 = window as any;
		var w2 = outputPane.contentWindow as any;
		for(var expr of [...tm.watches,...vm.autoWatches]) {
			var result = ''; 
			if(expr && (w1.$0 || !~expr.indexOf("$0"))) {
				try { result = w2.eval(expandShorthandsIn(expr)); }
				catch (ex) { result = '!!!' + (ex.message ? ex.message : `${ex}`); }
			}

			// output the current value
			vm.watchValues[expr] = result;
			vm.watchDisplayValues[expr] = `${result}`; // TODO
		}
		
		redrawIfReady();
	}


	// ===================================================
	// watch replacement dialog
	// ===================================================
	
	selectorGenerationDialog = new SelectorGenerationDialogViewModel(this)

	// ===================================================
	// settings dialog
	// ===================================================
	
	settingsDialog = new SettingsDialogViewModel(this)

	/** Removes the user cookie */
	logOut() {
		document.cookie = 'user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
		redrawIfReady();
	}

	/** Redirects to the login page */
	logIn() {
		location.href = '/login/github/start';
	}
	

	// ===================================================
	// output frame settings
	// ===================================================
	
	/** Whether the mouse is being tracked to select a new element */
	isPicking$ = m.prop(false)

	/** The currently to-be-selected element under the mouse */
	selectedElement$ = m.prop<Element>(null)

	/** Whether a line jump is advised in the html editor */
	shouldMoveToSelectedElement$ = m.prop(false);

	/** The mapping between current source lines and source lines at the time of the last run */
	lineMapping = [0]

	/** How many source lines the current run had */
	lineMappingLineCount = 1

	/** Cache of the auto-generated IDs, for cleaning purpose */
	idMappings = new Set<string>()

	/** Refreshes the output frame with the latest source code */
	run() {

		// hide outdated element outline
		this.isPicking$(false);
		this.selectedElement$(null);
		if(window.jsPaneConsoleOutput) { 
			window.jsPaneConsoleOutput.innerHTML = '';
		}

		// bail out if we don't have loaded yet
		if(!("outputPane" in window)) {
			setTimeout(x => this.run(), 100);
			return;
		}

		// remove any $ values since we are going to clear the inner document
		var w1 = window as any;
		var w2 = outputPane.contentWindow as any;
		w1.$0replacement = undefined;
		w1.$0 = w1.$1 = w1.$2 = w1.$3 = w1.$4 = 
		w1.$5 = w1.$6 = w1.$7 = w1.$8 = w1.$9 = undefined; 
		w2.$0 = w2.$1 = w2.$2 = w2.$3 = w2.$4 = 
		w2.$5 = w2.$6 = w2.$7 = w2.$8 = w2.$9 = undefined; 
		// TODO: try to match via sourceLine/tagName/id?
		for(var id of this.idMappings) {
			w2[id] = undefined;
		}
		this.idMappings.clear();
	
		// generate new document
		var d = outputPane.contentWindow.document;
		d.open();
		d.write("<!doctype html>");

		// prepare the console hooks
		outputPane.contentWindow.console.debug = function(...args) {
			args.forEach(arg => appendToConsole('-', arg));
			console.debug.apply(console,args);
		};
		outputPane.contentWindow.console.log = function(...args) {
			args.forEach(arg => appendToConsole('-', arg));
			console.log.apply(console,args);
		};
		outputPane.contentWindow.console.dir = function(...args) {
			args.forEach(arg => appendToConsole('-', arg));
			console.dir.apply(console,args);
		};
		outputPane.contentWindow.console.info = function(...args) {
			args.forEach(arg => appendToConsole('i', arg));
			console.info.apply(console,args);
		};
		outputPane.contentWindow.console.warn = function(...args) {
			args.forEach(arg => appendToConsole('!', arg));
			console.warn.apply(console,args);
		};
		outputPane.contentWindow.console.error = function(...args) {
			args.forEach(arg => appendToConsole('‼️', arg));
			console.error.apply(console,args);
		};

		// write the document content
		d.write("<title>" + tm.title.replace(/</g,"&lt;").replace(/>/g,"&gt;") + "</title>");
		d.write("<script>" + tm.jsHead + "<" + "/script>");
		d.write("<style>" + tm.css + "</style>");
		
		attributeLines(0);
		var html = tm.html;
		var htmlLines = html.split("\n");
		for(var lineIndex = 0; lineIndex < htmlLines.length;) {
			d.writeln(htmlLines[lineIndex]);
			attributeLines(++lineIndex);
		}
		
		d.write("<script>" + tm.jsBody + "<" + "/script>");
		
		d.close();
		
		// reset the line mapping
		vm.lineMapping = htmlLines.map((l,i) => i);
		vm.lineMappingLineCount = htmlLines.length;
		
		// create short names for all elements without custom id
		attributeIds(this)
		
		// rerun the watches
		this.refreshWatches();
		
		//-------------------------------------------------------
		
		/** Detects newly inserted elements and note which html line generated them */
		function attributeLines(lineIndex) {
			for(var i = d.all.length; i--;) {
				if(d.all[i].sourceLine == undefined) {
					d.all[i].sourceLine = lineIndex;
				} else {
					break;
				}
			}
		}
		
		/** Creates global variables to easily access nodes without id */
		function attributeIds(vm: ViewModel) {
			var tagCounters = Object.create(null);
			for(var i = 0; ++i < d.all.length;) {
				var el = d.all[i];
				if(el.sourceLine > 0 && el != d.body) {
					var tagCounter = tagCounters[el.tagName] = 1 + (tagCounters[el.tagName]|0);
					if(!el.id) {
						var tagId = el.tagName.toLowerCase() + tagCounter;
						if(!outputPane.contentWindow[tagId]) {
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
		location.hash = "#/json:" + JSON.stringify(tmData);
	}

	/** Saves the test model in the localStorage */
	saveLocally() {
		
		var data = tmData;

		var id = '';
		var idLetters = 'abcdefghijklmnopqrstuvwxyz0123456789';
		for(var i = 5; i--;) {
			id += idLetters[Math.floor(Math.random() * idLetters.length)];
		}

		sessionStorage.setItem('local:save', 'local:' + id);
		localStorage.setItem('local:' + id, JSON.stringify(data));
		location.hash = "#/local:" + id;

	}

	/** Saves the test model on the server */
	saveOnline() {
		// ensure test case title:
		if(!tm.title || tm.title == "UntitledTest") {
			try {
				tm.title = prompt("Enter a title for your test", tm.title);
			} catch (ex) {
				// do nothing
			}
		}
		// ensure the user is connected
		if(!this.githubIsConnected$()) {
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

			})

		}).catch(ex => {
			console.error(ex);
			alert("Oops, something went wrong... Try again or save locally by pressing ALT when you click on the save button.");
		});
	}

	/** Whether the test model is still waiting on some data from the server */
	isLoading$ = m.prop(false)

	/** Resets the test model based on new data */
	openFromJSON(newData?: TestDataModel) {
		this.isLoading$(false)
		Object.assign<TestDataModel,TestDataModel>(tmData, {
			title: 'UntitledTest',
			html: '',
			css: '',
			jsHead: '',
			jsBody: '',
			watches: []
		});
		if(newData) {
			Object.assign<TestDataModel,TestDataModel>(tmData, newData);
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
		function ln(...args) { html += (String.raw as any)(...args) + '\n'; }
		ln`<!DOCTYPE html>`;

		// ensure test case title:
		if(!tm.title || tm.title == "UntitledTest") {
			try {
				tm.title = prompt("Enter a title for your test", tm.title);
			} catch (ex) {
				// do nothing
			}
		}
		if(tm.title) {
			ln`<title>${tm.title.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</title>`;
		} else {
			ln`<title>UntitledTest</title>`;
		}

		// ensure test case harness:
		var pathToHarness = "/resources/";
		try {
			pathToHarness = prompt("Enter the path to the testharness folder", pathToHarness);
			if(pathToHarness && !/\/$/.test(pathToHarness)) { pathToHarness += '/'; }
		} catch (ex) {
			// do nothing
		}
		ln`<script src="${pathToHarness}testharness.js"></script>`;
		ln`<script src="${pathToHarness}testharnessreport.js"></script>`;

		// append the test case itself
		if(tm.jsHead) {
			ln`<script>${"\n\n"+tm.jsHead+"\n\n"}</script>`;
		}
		if(tm.css) {
			ln`<style>${"\n\n"+tm.css+"\n\n"}</style>`;
		}
		if(tm.html) {
			ln``;
			ln`${tm.html}`;
			ln``;
		}
		if(tm.jsBody) {
			ln`<script>${"\n\n"+tm.jsBody+"\n\n"}</script>`;
		}
		ln`<script>
var test_description = document.title;
promise_test(
	t => {
		return new Promise(test => addEventListener('load', e=>test()))
		${
			Array.from(tm.watches).map(
				expr => ({
					expression: expr,
					jsValue: vm.watchValues[expr]
				})
			).filter(
				w => !!w.expression
			).map(
				w => 
				`.then(test => assert_equals(${
					expandShorthandsIn(w.expression)
				}, ${
					JSON.stringify(w.jsValue)
				}, ${
					JSON.stringify(`Invalid ${w.expression};`)
				}))`
			).join('\n\t\t')
		}
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

	/** The attached view model */
	vm = null as ViewModel;
	constructor(vm: ViewModel) {
		this.vm = vm;
	}

	/** Whether the dialog is opened or closed */
	isOpened$ = m.prop(false)

	/** The raw watch expression we want to pin */
	watchExpression$ = m.prop("")

	/** Its precomputed value, in case one was given */
	watchValue$ = m.prop({ defined: false, value: undefined as any })

	/** The id auto-generated for the element, if any */
	autoId$ = m.prop("")

	/** Whether there is an auto-generated id (readonly) */
	isAutoAvailable$ = cachedCast(this.autoId$, x => !!x)

	/** The mode chosen by the user */
	chosenMode$ = m.prop<"auto"|"id"|"selector">("auto")

	/** The id the user typed in the text box (id mode) */
	chosenId$ = m.prop("")

	/** The selector the user typed in the text box (selector mode) */
	chosenSelector$ = m.prop("")

}

class SettingsDialogViewModel {

	/** The attached view model */
	vm = null as ViewModel;
	constructor(vm: ViewModel) {
		this.vm = vm;
	}

	/** Whether the dialog is opened or closed */
	isOpened$ = m.prop(false)

	/** Whether to use Monaco on this device or not */
	useMonaco$ = m.prop2(
		(v) => !localStorage.getItem('noMonaco'),
		(v) => localStorage.setItem('noMonaco', v?'':'true')
	);

	/** Ask the viewmodel to log the user out */
	logOut() {
		this.vm.logOut();
	}

	/** Ask the viewmodel to log a user in */
	logIn() {
		this.vm.logIn();
	}

}

var vm = new ViewModel();
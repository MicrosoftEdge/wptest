/// <reference path="wptest-vm.tsx" />

var Input = new Tag <{ value$:Prop<string> } & JSX.IntrinsicInputElement> ().from(a=>
	<input {...attributesOf(a)} value={a.value$()} oninput={bindTo(a.value$)} onchange={bindTo(a.value$)} />
);

var InputCheckbox = new Tag <{ value$:Prop<boolean> } & JSX.IntrinsicInputElement> ().from(a=>
	<input type="checkbox" {...attributesOf(a)} checked={a.value$()} onchange={bindTo(a.value$,"checked")} />
);

var InputRadio = new Tag <{ value:string, checkedValue$:Prop<string> } & JSX.IntrinsicInputElement> ().from(a=>
	<input type="radio" {...attributesOf(a)} checked={a.checkedValue$()==a.value} onchange={bindTo(a.checkedValue$)} />
);

var BodyToolbar = new Tag <{ model:TestModel }> ().from(a =>
	<body-toolbar row role="toolbar">
		<button onclick={e=>vm.run()} title="Move your code to the iframe">Run</button>
		<button onclick={e=>{if(e.altKey) { vm.saveLocally() } else { vm.saveOnline() }}} title="Save online, or locally if you maintain Alt pressed">Save</button>
		<button onclick={e=>vm.saveToFile()} title="Download as a weplatform test case">Export</button>
		<hr style="visibility: hidden; flex:1 0 0;" />
		<Input value$={a.model.title$} title="Title of your test case" />
	</body-toolbar>
);

interface MonacoTextEditorState { editor:monaco.editor.IStandaloneCodeEditor, value:string, isDirty:boolean }
var MonacoTextEditor = new Tag <{ id:string, value$:Prop<string>, language:string }, MonacoTextEditorState> ().with(
	{
		oncreate(this: MonacoTextEditorState, node: M.VirtualNode) {

			// set default state values
			this.editor = null;
			this.value = node.attrs.value$();
			this.isDirty = false;

			// wait for monaco to load if needed
			require(['vs/editor/editor.main'], then => {
				
				// create the text editor, and save it in the state
				this.value = node.attrs.value$();
				this.isDirty = false;
				let editor = this.editor = monaco.editor.create(document.getElementById(node.attrs.id+'Area'), {
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
					if(this.editor.isFocused()) {
						this.isDirty = true;
						redrawIfReady();
					}
				});

				// register to the window resize event, and relayout if needed
				window.addEventListener('resize', x => {
					this.editor.layout();
				});

				// hookup language-specific things
				switch(node.attrs.language) {
					case "html": {

						this.editor.getModel().onDidChangeContent(e => {
							
							var oldLineCount = 1 + e.range.endLineNumber - e.range.startLineNumber;
							var newLineCount = countLines(e.text);
							var deltaLineCount = (newLineCount - oldLineCount);
							var totalLineCount = countLines(editor.getValue());
							var newLineMapping = new Array(totalLineCount);
							for(var x = 0; x<totalLineCount; x++) {
								if(x < e.range.startLineNumber) {
									newLineMapping[x] = crossMappingHelper(x);
								} else if(x < e.range.startLineNumber + newLineCount - 1) {
									newLineMapping[x] = crossMappingHelper(e.range.startLineNumber-1);
								} else {
									newLineMapping[x] = crossMappingHelper(x - deltaLineCount);
								}
							}
							vm.lineMapping = newLineMapping;
							
							function countLines(txt) {
								return txt.split(/\n/g).length;
							}
							
							function crossMappingHelper(x) {
								if(x < vm.lineMapping.length) {
									return vm.lineMapping[x];
								} else {
									return vm.lineMappingLineCount-1;
								}
							}
							
						});

						this.editor.addAction({
							id: 'wpt-inspect',
							label: 'Inspect this element',
							contextMenuGroupId: 'navigation',
							contextMenuOrder: 0,
							run() {
								var sourceLine = 1+vm.lineMapping[editor.getPosition().lineNumber-1];
								var w = outputPane.contentWindow;
								var d = outputPane.contentDocument;
								for(var i = 0; i<d.all.length; i++) {
									var elm = d.all[i];
									if(elm.sourceLine == sourceLine && elm != d.body) {
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
								editor.setValue(cssbeautify(editor.getValue(), { indent:'\t' }));
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
		
		onbeforeupdate(this: MonacoTextEditorState, node: M.VirtualNode, oldn: M.VirtualNode) {

			// verifies that we have a text control to work with
			if(!this.editor) return false;

			// verifies whether we need to change the text of the control
			var theNewValue$ = node.attrs["value$"];
			var theNewValue = theNewValue$();
			var cantForciblyUpdate = () => (
				this.editor.isFocused() 
				&& this.value 
				&& theNewValue
			);
			if(theNewValue != this.value && !cantForciblyUpdate()) {

				// there was a model update
				this.isDirty = false;
				this.editor.setValue(this.value = theNewValue);

				// in this case, stop tracking the line mapping
				if(node.attrs.language === 'html') {
					vm.lineMapping = this.value.split(/\n/g).map(l => 0);
					vm.shouldMoveToSelectedElement$(false);
				}

			} else if(this.isDirty) {

				// there was a content update
				theNewValue$(this.value = this.editor.getValue());

			} else {

				// no update
				
			}

			// check whether we should move the cursor as requested by the view model
			if(vm.shouldMoveToSelectedElement$()) {
				vm.shouldMoveToSelectedElement$(false); // only one editor should take this

				var elm = vm.selectedElement$();
				var column = 0; 
				try { column = this.editor.getValue().split(/\n/g)[elm.sourceLine-1].match(/^\s+/)[0].length; } catch (ex) {}
				this.editor.revealLineInCenterIfOutsideViewport(elm.sourceLine);
				this.editor.setPosition({lineNumber:elm.sourceLine, column:1+column});
				this.editor.focus();

			}

			// this control never needs to be updated by mithril
			return false;

		}
	}
).from((a,c,s) =>
	<monaco-text-editor id={a.id} language={a.language}>
		<monaco-text-editor-area 
			id={a.id+'Area'} 
			style="position:absolute;top:0;left:0;right:0;bottom:0;"
		/>
	</monaco-text-editor>
);

var TabButton = new Tag <{ pane:string, activePane$: Prop<string> } & JSX.IntrinsicElement> ().from((a,c)=>
	<button {...attributesOf(a)} onclick={e=>a.activePane$(a.pane)} aria-controls={a.pane} aria-expanded={`${a.pane==a.activePane$()}`}>{c}</button>
);

var ToolsPaneToolbar = new Tag <{ activePane$:Prop<string> }> ().from(a=>
	<tools-pane-toolbar row aria-controls={a.activePane$()} role="toolbar">
		<TabButton pane="jsPaneWatches" activePane$={a.activePane$}>Watches</TabButton>
		<TabButton pane="jsPaneConsole" activePane$={a.activePane$}>Console</TabButton>
		<TabButton pane="jsPaneHeadCode" activePane$={a.activePane$}>Header code</TabButton>
		<TabButton pane="jsPaneBodyCode" activePane$={a.activePane$}>Body code</TabButton>
	</tools-pane-toolbar>
);

var ToolsPaneWatches = new Tag <{ id:string, activePane$:Prop<string> }> ().from(a =>
	<tools-pane-watches block id={a.id} is-active-pane={a.activePane$()==a.id}>
		<Input class="watch-filter-textbox" value$={vm.watchFilterText$} onkeyup={e=>{if(e.keyCode==27){vm.watchFilterText$('')}}} type="text" required placeholder="🔎" title="Filter the watch list" />
		<ul class="watch-list">
			<li>
				<input type="checkbox" checked disabled title="Uncheck to delete this watch" />
				<input type="text" placeholder="/* add new watch here */" onchange={e=>{if(e.target.value) { vm.addPinnedWatch(e.target.value); e.target.value=''; e.target.focus(); }}} />
				<output></output>
			</li>
		{tm.watches.map((expr,i,a) => 
			<li>
				<input type="checkbox" checked title="Uncheck to delete this watch" onchange={e=>{if(!e.target.checked) { vm.removePinnedWatch(expr); e.target.checked=true; }}} />
				<Input type="text" value$={m.prop2(x => expr, v => a[i]=v)} />
				<output>{`${vm.watchDisplayValues[expr]||''}`}</output>
			</li>
		)}
		</ul>
		<ul class="watch-list">{vm.autoWatches.map(expr => 
			<li hidden={vm.hiddenAutoWatches[expr]||!vm.watchFilter$().matches(expr)}>
				<input type="checkbox" title="Check to pin this watch" onchange={e=>{if(e.target.checked) { vm.addPinnedWatch(expr); e.target.checked=false; }}} />
				<input type="text" readonly value={expr} />
				<output>{`${vm.watchDisplayValues[expr]||''}`}</output>
			</li>
		)}</ul>
	</tools-pane-watches>
)

var ToolsPaneConsole = new Tag <{ id:string, activePane$:Prop<string> }> ().from(a =>
	<tools-pane-console id={a.id} is-active-pane={a.activePane$()==a.id}></tools-pane-console> // TODO
)

var ToolsPaneCode = new Tag <{ id:string, activePane$:Prop<string>, value$:Prop<string> }> ().from(a =>
	<tools-pane-code id={a.id} is-active-pane={a.activePane$()==a.id}>
		<MonacoTextEditor id={a.id+'--editor'} value$={a.value$} language="javascript" />
	</tools-pane-code> // TODO
)

var OutputPaneCover = new Tag <{ id:string }> ().with({

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
			} as any as CSSStyleDeclaration,

			borderBox: {
				borderStyle: "solid",
				borderColor: "rgba(0,0,0,0.3)"
			} as any as CSSStyleDeclaration,

			paddingBox: {
				borderStyle: "solid",
				borderColor: "rgba(0,0,0,0.4)", 
				backgroundColor: "rgba(0,0,0,0.5)", 
				backgroundClip: "padding-box"
			} as any as CSSStyleDeclaration,

			contentBox: {
				// nothing special
			} as any as CSSStyleDeclaration

		};
		if(elm) {
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
			styles.contentBox.width = `${gBCW(elm)-pl-pr-bl-br}px`;
			styles.contentBox.height = `${gBCH(elm)-pt-pb-bt-bb}px`;
		}
		return styles;
	}),

	setCurrentElementFromClick(e: PointerEvent) {

		var elm = outputPane.contentDocument.elementFromPoint(e.offsetX, e.offsetY);
		vm.selectedElement$(elm);
		
		if(e.type == 'pointerdown') {

			// stop picking on pointer down
			vm.isPicking$(false);

			// also, update the watches for this new element
			vm.refreshWatches(elm);
			if(elm.sourceLine) {
				vm.shouldMoveToSelectedElement$(true);
			}
		}

		// we kinda need a synchronous redraw to be reactive
		// TODO: optimize this in another way?
		m.redraw(true); 

	}

}).from((a,c,self)=>
	<output-pane-cover block id={a.id} onpointermove={self.shouldBeHidden() ? null : e=>self.setCurrentElementFromClick(e)} onpointerdown={self.shouldBeHidden() ? null : e=>self.setCurrentElementFromClick(e)} is-active={vm.isPicking$()}>
		<margin-box block hidden={self.shouldBeHidden()} style={self.boxStyles$().marginBox}>
			<border-box block style={self.boxStyles$().borderBox}>
				<padding-box block style={self.boxStyles$().paddingBox}>
					<content-box block style={self.boxStyles$().contentBox}>
					</content-box>
				</padding-box>
			</border-box>
		</margin-box>
	</output-pane-cover>
)

var HTMLPane = new Tag().from(a =>
	<html-pane disabled-style={{'flex-grow':tm.html?3:1}}><MonacoTextEditor id="htmlPaneEditor" value$={tm.html$} language="html" /></html-pane>
)

var CSSPane = new Tag().from(a =>
	<css-pane disabled-style={{'flex-grow':tm.css?3:1}}><MonacoTextEditor id="cssPaneEditor" value$={tm.css$} language="css" /></css-pane>
);

var JSPane = new Tag().from(a =>
	<js-pane disabled-style={{'flex-grow':tm.jsBody?3:1}}><MonacoTextEditor id="jsPaneEditor" value$={vm.jsCombined$} language="javascript" /></js-pane>
);

var ToolsPane = new Tag().from(a =>
	<tools-pane>
		<ToolsPaneToolbar activePane$={vm.activeJsTab$} />
		<tools-pane-tabs>
			<ToolsPaneWatches id="jsPaneWatches" activePane$={vm.activeJsTab$} />
			<ToolsPaneConsole id="jsPaneConsole" activePane$={vm.activeJsTab$} />
			<ToolsPaneCode id="jsPaneHeadCode" value$={tm.jsHead$} activePane$={vm.activeJsTab$} />
			<ToolsPaneCode id="jsPaneBodyCode" value$={tm.jsBody$} activePane$={vm.activeJsTab$} />
		</tools-pane-tabs>
	</tools-pane>
);

var OutputPane = new Tag().from(a =>
	<output-pane>
		<iframe id="outputPane" src="about:blank" border="0" frameborder="0" is-active={!vm.isPicking$()}></iframe>
		<OutputPaneCover id="outputPaneCover" />
		<output-pane-toolbar role="toolbar">
			<button onclick={e=>vm.isPicking$(!vm.isPicking$())}>⊳</button>
			<button onclick={e=>vm.refreshWatches()}>↻</button>
		</output-pane-toolbar>
	</output-pane>
);

var SelectorGenerationDialog = new Tag().with({
	generateReplacement() {
		var form = vm.selectorGenerationDialog;
		var w1 = window as any;
		// create the requested replacement, if possible
		switch(form.chosenMode$()) {
			case "auto": {
				w1.$0replacement = w1.$0.sourceTagId;
				break;
			}
			case "id": {
				if(form.chosenId$()) {
					w1.$0replacement = `$(${JSON.stringify('#'+form.chosenId$())})`;
				}
				break;
			}
			case "selector": {
				if(form.chosenSelector$()) {
					w1.$0replacement = `$(${JSON.stringify(form.chosenSelector$())})`;
				}
				break;
			}
		}

		form.isOpened$(false);
		
		if(form.watchValue$().defined) {
			vm.addPinnedWatch(form.watchExpression$(),form.watchValue$().value);
		} else {
			vm.addPinnedWatch(form.watchExpression$());			
		}
	}
}).from((a,s,self) => 
	<dialog as="selector-generation-dialog" hidden={!vm.selectorGenerationDialog.isOpened$()}>

		<section tabindex="-1">
			<h1>How do you want to do this?</h1>
			<form action="POST" onsubmit={e => { e.preventDefault(); self.generateReplacement(); }}>
				<label hidden={!vm.selectorGenerationDialog.isAutoAvailable$()} style="display: block; margin-bottom: 10px">
					<InputRadio name="chosenMode" value="auto" checkedValue$={vm.selectorGenerationDialog.chosenMode$} />
					Use the source index
				</label>
				<label style="display: block; margin-bottom: 10px">
					<InputRadio name="chosenMode" value="id" checkedValue$={vm.selectorGenerationDialog.chosenMode$} />
					Assign an id the the element
					<Input value$={vm.selectorGenerationDialog.chosenId$} onfocus={e=>vm.selectorGenerationDialog.chosenMode$('id')} />
				</label>
				<label style="display: block; margin-bottom: 10px">
					<InputRadio name="chosenMode" value="selector" checkedValue$={vm.selectorGenerationDialog.chosenMode$} />
					Use a css selector
					<Input value$={vm.selectorGenerationDialog.chosenSelector$} onfocus={e=>vm.selectorGenerationDialog.chosenMode$('selector')} />
				</label>
				<input type="submit" value="OK" />
				<input type="button" value="Cancel" onclick={e=>vm.selectorGenerationDialog.isOpened$(false)} />
			</form>
		</section>

	</dialog>
)

var TestEditorView = new Tag <{id:string}> ().from(a => {
	// if the page moved to a new id 
	// then we need to reset all data and download the new test
	if(a.id != vm.currentTestId$() && a.id == location.hash.substr(2)) {
		vm.currentTestId$(a.id);
		if(a.id.indexOf('local:') == 0) {
			vm.openFromJSON(JSON.parse(localStorage.getItem(a.id)));
		} else if(a.id && a.id != 'new') {
			vm.isLoading$(true);
			vm.openFromJSON(null);
			fetch('/uploads/' + a.id + '.json').then(r => r.json()).then(d => {
				vm.openFromJSON(d);
			});
		}
	}
	// in all cases, we return the same markup though to avoid trashing
	return (
		<body>

			<BodyToolbar model={tm} />
			<top-row row>
				<HTMLPane />
				<CSSPane />
				<JSPane />
			</top-row>

			<bottom-row row>
				<OutputPane />
				<ToolsPane />
			</bottom-row>

			<SelectorGenerationDialog />

		</body>
	).children;
})

m.route(document.body, '/new', { '/:id': TestEditorView() })

//----------------------------------------------------------------
setInterval(updatePageTitle, 3000);
function updatePageTitle() {
	var titlePart = '';
	var urlPart = '';
	var id = vm.currentTestId$();
	if(id && id != 'new') {
		urlPart = 'wptest.center/#/' + id;
	} else {
		urlPart = 'wptest.center';
	}
	if(tm.title && tm.title != 'UntitledTest') {
		titlePart = tm.title + ' - ';
	}
	document.title = titlePart + urlPart;
}

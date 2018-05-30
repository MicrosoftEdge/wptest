// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

///
/// This files contains a few helpers just because I am lazy :)
///
/// <reference path="mithril.d.ts" />

interface Element { sourceLine?: number; sourceTagId?: string; }

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

var describe = function (elm: Element) {
	return elm.nodeName + (elm.id ? `#${elm.id}` : '') + (elm.classList.length ? `.${elm.classList[0]}` : '');
}

var convertObjectToDescription = function(arg):string {
	if(arg === null) return "null";
	if(arg === undefined) return "undefined";
	if(arg instanceof String) return arg as any; // only string objects can get through
	if(typeof arg == "number") { // we allow more than what json recognizes
		if(Number.isNaN(arg)) return "Number.NaN";
		if(!Number.isFinite(arg) && arg >= 0) return "Number.POSITIVE_INFINITY";
		if(!Number.isFinite(arg) && arg <= 0) return "Number.NEGATIVE_INFINITY";
		return JSON.stringify(arg);
	}
	if(typeof arg == 'function') {
		try { return `${arg}`; } catch (ex) {}
		return '[object Function]'
	}

	var tag = '', str = '', jsn = '';
	try { tag = Object.prototype.toString.call(arg); } catch (ex) {};
	try { str = `${arg}` } catch (ex) {}
	try { jsn = JSON.stringify(arg) } catch (ex) {}
	if(str == tag) { str = ''; }
	if(tag == '[object Object]') tag = '';

	if(arg.cloneNode && 'outerHTML' in arg) {
		try { return arg.cloneNode(false).outerHTML + ' ' + jsn } catch (ex) {}
	}
	if(tag && (typeof(arg)=='object' || typeof(arg)=='symbol')) {
		try { return [tag,str,jsn].filter(x=>x).join(' ') } catch (ex) {}	
	}
	if(jsn) return jsn;
	if(str) return str;
	if(tag) return tag;
	return "[object]";
}

interface _SimpleSelector { selector: string, slot: 'tag' | 'id' | 'class' | 'pseudo' }
interface _CompoundSelector extends Array<_SimpleSelector> { }
var buildSelectorFor = function (elm: Element) {

	var isValidPair = (selector: string, elm: Element) => {
		var matches = elm.ownerDocument.querySelectorAll(selector);
		return (matches.length == 1) && (matches[0] === elm);
	};
	var isValid = (selector: string) => {
		return isValidPair(selector, elm);
	}

	var getPossibleAttributesFor = (elm: Element) => [
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
	] as Array<_CompoundSelector>;

	var buildSelectorFrom = (input: Array<_CompoundSelector>) => {
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
	}

	var escapeIdentForCSS = (item: string) => (
		(item.split('')).map(function (character) {
			if (character === ':') {
				return "\\" + (':'.charCodeAt(0).toString(16).toUpperCase()) + " ";
			} else if (/[ !"#$%&'()*+,.\/;<=>?@\[\\\]^`{|}~]/.test(character)) {
				return "\\" + character;
			} else {
				return encodeURIComponent(character).replace(/\%/g, '\\');
			}
		}).join('')
	);

	var getTagNameOf = (elm: Element) => escapeIdentForCSS(elm.tagName.toLowerCase());
	var getNthTypeOf = (elm: Element) => {

		var index = 0, cur = elm; do {
			if (cur.tagName == elm.tagName) {
				index++;
			}
		} while (cur = cur.previousElementSibling);

		return index;
	};
	var getIdsOf = (elm: Element) => {
		return elm.id ? [elm.id] : [];
	}
	var getClassesOf = (elm: Element) => {
		var result = [] as Array<string>;
		for (var i = 0; i < elm.classList.length; i++) {
			result.push(elm.classList[i]);
		}
		return result;
	}
	var getAttributesOf = (elm: Element) => {
		var result = [] as Array<string>;
		for (var i = 0; i < elm.attributes.length; i++) {
			switch(elm.attributes[i].name.toLowerCase()) {
				case "id": case "class": case "style": break;
				case "name": if (/^[_-a-z0-9]+$/i.test(elm.getAttribute('name'))) { result.push('name="'+elm.getAttribute('name')+'"'); break; }
				case "type": if (elm instanceof HTMLInputElement) { result.push('type='+elm.type); break; }
				default: result.push(elm.attributes[i].name);
			}
		}
		return result;
	}

	var buildLocalSelectorFor = (elm: Element, prelude: string) => {
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
					} else if (~(['HTML','BODY','HEAD','MAIN'].indexOf(parent.tagName))) {
						prelude = `${escapeIdentForCSS(getTagNameOf(parent))} > `;
					} else if (parent.classList.length) {
						prelude = `${escapeIdentForCSS(getTagNameOf(parent))}.${escapeIdentForCSS(parent.classList[0])} > `;
					} else {
						prelude = `${escapeIdentForCSS(getTagNameOf(parent))} > `
					}
					// maybe we can even remove the nth-of-type now?
					let simplifiedElementSelector = elementSelector.replace(/:nth-of-type\(.*?\)/,'');
					if (isValid(prelude + simplifiedElementSelector)) {
						elementSelector = simplifiedElementSelector;
					}
				}
			}
			return prelude + elementSelector;
		} else if (prelude) {
			
			// the given prelude is not valid
			return null;

		} else {
			// let's see if we can just reply :root
			if (!elm.parentElement) {
				return ':root';
			}
			// let's try to find an id parent which can narrow down to one element only
			let generalPrelude = '';
			let cur = elm.parentElement; while(cur = cur.parentElement) {
				if(cur.id) {
					let r = buildLocalSelectorFor(elm, `#${escapeIdentForCSS(cur.id)} `);
					if(r) return r;
					break;
				}
			}
			// let's try again but this time using a class
			cur = elm.parentElement; while(cur = cur.parentElement) {
				if(cur.classList.length) {
					for(let ci = 0; ci < cur.classList.length; ci++) {
						let r = buildLocalSelectorFor(elm, `.${escapeIdentForCSS(cur.classList[ci])} `);
						if(r) return r;
					}
				}
			}
			// let's just append this selector to a unique selector to its parent
			//TODO: actually, we should filter based on whether we find the element uniquely instead, not its parent
			let parentSelector = buildSelectorFor(elm.parentElement)
			return buildLocalSelectorFor(elm, parentSelector + " > ");
		}
	}

	return buildLocalSelectorFor(elm, '');
}

function encodeHash(text) {
	return text.replace(/\u200B/g, "\u200B\u200B").replace(/#/g, "\u200Bⵌ").replace(/%/g, "\u200B℅").replace(/\r/g,"\u200Br").replace(/\n/g,"\u200Bn").replace(/\t/g,"\u200Bt");
}
function decodeHash(text) {
	return text.replace(/(?:%[a-f0-9]+)+/gim, function(t) { try { return decodeURIComponent(t) } catch (ex) { return t }}).replace(/\u200Bt/g,"\t").replace(/\u200Bn/g,"\n").replace(/\u200Br/g,"\r").replace(/\u200B℅/g,"%").replace(/\u200Bⵌ/g,"#").replace(/\u200B\u200B/g, "\u200B");
}

/* fix for pad */
if(window.external && ('DoEvents' in window.external)) {
	history.replaceState = function() {}
	history.pushState = function() {};
}

/* fix for ie */
if(!Array.from) {
	Array.from = function from(src,mapFn) {
		var array = new Array(src.length);
		for(var i = 0; i<src.length; i++) {
			array[i] = mapFn ? mapFn(src[i]) : src[i];
		}
		return array;
	} as any;
}
if(!Object.assign) {
	Object.assign = function assign(target, source) {
		for(var key in source) {
			target[key] = source[key];
		}
	} as any;
}
if(!String.raw) {
	String.raw = function(callSite, ...substitutions) {
		let template = Array.from(callSite.raw);
		return template.map((chunk, i) => {
			if (callSite.raw.length <= i) { return chunk; }
			return substitutions[i - 1] ? substitutions[i - 1] + chunk : chunk;
		}).join('');	
	} as any;
}
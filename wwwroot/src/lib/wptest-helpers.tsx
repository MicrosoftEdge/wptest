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

var rAF = window.requestAnimationFrame.bind(window);

var describe = function(node) { 
	return node.nodeName + (node.id ? `#${node.id}` : '') + (node.classList.length ? `.${node.classList[0]}` : '');
}
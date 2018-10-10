@echo off
tsc .\wwwroot\src\wptest.tsx --jsx react --lib DOM,ES2018,DOM.Iterable,ScriptHost --target es5 --out .\wwwroot\bin\wptest.js
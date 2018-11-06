// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

interface TestDataModel {
	title: string,
	html: string,
	css: string,
	jsHead: string,
	jsBody: string,
	watches: Array<string>,
	watchValues: Array<string>,
	fileName: string,
	filePath: string,
}

interface TestModel extends TestDataModel {
	title$: Prop<string>,
	html$: Prop<string>,
	css$: Prop<string>,
	jsHead$: Prop<string>,
	jsBody$: Prop<string>,
	watches$: Prop<string[]>,
	watchValues$: Prop<string[]>,
	fileName$: Prop<string>,
	filePath$: Prop<string>,
	sourceModel: TestDataModel,
}
interface ScriptTestResultModel {
	index: number,
	name: string,
	message?: string,
	status: number,
	phase: number
}
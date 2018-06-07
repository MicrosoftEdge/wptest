// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

interface TestDataModel {
	title: string,
	html: string,
	css: string,
	jsHead: string,
	jsBody: string,
	watches: Array<string>,
	watchValues: Array<string>
}

interface TestModel extends TestDataModel {
	title$: Prop<string>,
	html$: Prop<string>,
	css$: Prop<string>,
	jsHead$: Prop<string>,
	jsBody$: Prop<string>,
	watches$: Prop<string[]>,
	watchValues$: Prop<string[]>,
	sourceModel: TestDataModel
}
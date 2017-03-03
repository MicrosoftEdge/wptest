interface TestDataModel {
	title: string,
	html: string,
	css: string,
	jsHead: string,
	jsBody: string,
	watches: Array<string>,
}

interface TestModel extends TestDataModel {
	title$: Prop<string>,
	html$: Prop<string>,
	css$: Prop<string>,
	jsHead$: Prop<string>,
	jsBody$: Prop<string>,
	watches$: Prop<string>,
}
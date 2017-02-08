// Type definitions for mithril.js 1.0
// Project: https://github.com/lhorie/mithril.js
// Definitions by: Mike Linkovich <https://github.com/spacejack>

declare namespace M {

	interface Lifecycle<A,S> {
		/** The oninit hook is called before a vnode is touched by the virtual DOM engine. */
		oninit?: (this: S, vnode: VirtualNode<A,S>) => void;
		/** The oncreate hook is called after a DOM element is created and attached to the document. */
		oncreate?: (this: S, vnode: RenderedVirtualNode<A,S>) => void;
		/** The onbeforeupdate hook is called before a vnode is diffed in a update. */
		onbeforeupdate?: (this: S, vnode: VirtualNode<A,S>, old: VirtualNode<A,S>) => boolean;
		/** The onupdate hook is called after a DOM element is updated, while attached to the document. */
		onupdate?: (this: S, vnode: RenderedVirtualNode<A,S>) => void;
		/** The onbeforeremove hook is called before a DOM element is detached from the document. If a Promise is returned, M only detaches the DOM element after the promise completes. */
		onbeforeremove?: (this: S, vnode: RenderedVirtualNode<A,S>) => Promise<any> | void;
		/** The onremove hook is called before a DOM element is removed from the document. */
		onremove?: (this: S, vnode: RenderedVirtualNode<A,S>) => void;
	}

	interface Hyperscript {
		/** Creates a virtual element (Vnode). */
		(selector: string, ...children: any[]): VirtualNode<any,any>;
		/** Creates a virtual element (Vnode). */
		<A,S>(component: Component<A,S> | {new(vnode: CVirtualNode<A>): ClassComponent<A>} | FactoryComponent<A,S>, a?: (A & Lifecycle<A,S>) | Children, ...children: Children[]): VirtualNode<A,S>;
		/** Creates a fragment virtual element (Vnode). */
		fragment(attrs: any, children: Children[]): VirtualNode<any,any>;
		/** Turns an HTML string into a virtual element (Vnode). Do not use trust on unsanitized user input. */
		trust(html: string): VirtualNode<any,any>;
	}

	interface RouteResolver {
		/** The onmatch hook is called when the router needs to find a component to render. */
		onmatch?: (args: any, requestedPath: string) => M.Component<any,any> | {new(vnode: CVirtualNode<any>): ClassComponent<any>} | FactoryComponent<any,any> | Promise<M.Component<any,any> | {new(): Component<any,any>} | FactoryComponent<any,any>> | void;
		/** The render method is called on every redraw for a matching route. */
		render?: (vnode: M.VirtualNode<any,any>) => Children;
	}

	interface RouteDefs {
		[url: string]: Component<any,any> | {new(vnode: CVirtualNode<any>): ClassComponent<any>} | FactoryComponent<any,any> | RouteResolver;
	}

	interface RouteOptions {
		replace?: boolean;
		state?: any;
		title?: string;
	}

	interface Route {
		/** Creates application routes and mounts Components and/or RouteResolvers to a DOM element. */
		(element: HTMLElement, defaultRoute: string, routes: RouteDefs): void;
		/** Returns the last fully resolved routing path, without the prefix. */
		get(): string;
		/** Redirects to a matching route or to the default route if no matching routes can be found. */
		set(route: string, data?: any, options?: RouteOptions): void;
		/** Defines a router prefix which is a fragment of the URL that dictates the underlying strategy used by the router. */
		prefix(urlFragment: string): void;
		/** This method is meant to be used in conjunction with an <a> Vnode's oncreate hook. */
		link(vnode: VirtualNode<any,any>): (e: Event) => void;
		/** Returns the named parameter value from the current route. */
		param(name?: string): any;
	}

	interface Mount {
		/** Mounts a component to a DOM element, enabling it to autoredraw on user events. */
		(element: Element, component: Component<any,any> | {new(vnode: CVirtualNode<any>): ClassComponent<any>} | FactoryComponent<any,any> | null): void;
	}

	interface WithAttr {
		/** Creates an event handler which takes the value of the specified DOM element property and calls a function with it as the argument. */
		(name: string, callback: (value: any) => void, thisArg?: any): (e: {currentTarget: any, [p: string]: any}) => boolean;
	}

	interface ParseQueryString {
		/** Returns an object with key/value pairs parsed from a string of the form: ?a=1&b=2 */
		(queryString: string): any;
	}

	interface BuildQueryString {
		/** Turns the key/value pairs of an object into a string of the form: a=1&b=2 */
		(values: {[p: string]: any}): string;
	}

	interface RequestOptions<T> {
		method?: string;
		data?: any;
		async?: boolean;
		user?: string;
		password?: string;
		withCredentials?: boolean;
		config?: (xhr: XMLHttpRequest) => void;
		headers?: any;
		type?: any;
		serialize?: (data: any) => string;
		deserialize?: (str: string) => T;
		extract?: (xhr: XMLHttpRequest, options: RequestOptions<T>) => string;
		useBody?: boolean;
		background?: boolean;
	}

	interface RequestOptionsAll<T> extends RequestOptions<T> {
		url: string;
	}

	interface Request {
		/** Makes an XHR request and returns a promise. */
		<T>(options: RequestOptionsAll<T>): Promise<T>;
		/** Makes an XHR request and returns a promise. */
		<T>(url: string, options?: RequestOptions<T>): Promise<T>;
	}

	interface JsonpOptions {
		data?: any;
		type?: any;
		callbackName?: string;
		callbackKey?: string;
		background?: boolean;
	}

	interface JsonpOptionsAll extends JsonpOptions {
		url: string;
	}

	interface Jsonp {
		/** Makes a JSON-P request and returns a promise. */
		<T>(options: JsonpOptionsAll): Promise<T>;
		/** Makes a JSON-P request and returns a promise. */
		<T>(url: string, options?: JsonpOptions): Promise<T>;
	}

	interface RequestService {
		request: Request;
		jsonp: Jsonp;
	}

	interface Render {
		/** Renders a vnode structure into a DOM element. */
		(el: Element, vnodes: Children): void;
	}

	interface RenderService {
		render: Render
	}

	interface Redraw {
		/** Manually triggers a redraw of mounted components. */
		(): void;
		(force?: boolean): void;
	}

	interface RedrawService {
		redraw: Redraw
		render: Render
	}

	interface Static extends Hyperscript {
		route: Route;
		mount: Mount;
		withAttr: WithAttr;
		render: Render;
		redraw: Redraw;
		request: Request;
		jsonp: Jsonp;
		parseQueryString: ParseQueryString;
		buildQueryString: BuildQueryString;
		version: string;
	}

	// Vnode children types
	type Child = VirtualNode<any,any> | string | number | boolean | null | undefined;
	interface ChildArray extends Array<Children> {}
	type Children = Child | ChildArray;

	interface VirtualNode<A = any, S extends Lifecycle<A,S> = Lifecycle<A,S>> {
		tag: string | Component<A,S>;
		attrs: A;
		state: S;
		key?: string;
		children?: VirtualNode<any,any>[];
		events?: any;
	}

	// In some lifecycle methods, Vnode will have a dom property
	// and possibly a domSize property.
	interface RenderedVirtualNode<A=any,S=Lifecycle<A,S>> extends VirtualNode<A,S> {
		dom: Element;
		domSize?: number;
	}

	interface CVirtualNode<A> extends VirtualNode<A, ClassComponent<A>> {}

	interface RenderedCVirtualNode<A> extends RenderedVirtualNode<A, ClassComponent<A>> {}

	interface Component<A=any, S extends Lifecycle<A,S>=Lifecycle<A,S>> extends Lifecycle<A,S> {
		view (this: S, vnode: VirtualNode<A,S>): VirtualNode<any,any> | null | void | (VirtualNode<any,any> | null | void)[];
	}

	interface ClassComponent<A=any> extends Lifecycle<A,ClassComponent<A>> {
		view (this: ClassComponent<A>, vnode: CVirtualNode<A>): VirtualNode<any,any> | null | void | (VirtualNode<any,any> | null | void)[];
	}

	// Factory component
	type FactoryComponent<A,S> = (vnode: VirtualNode<A,S>) => Component<A,S>

	type Unary<T,U> = (input: T) => U;

	interface Functor<T> {
		map<U>(f: Unary<T,U>): Functor<U>;
		ap?(f: Functor<T>): Functor<T>;
	}

	interface Stream<T> {
		/** Returns the value of the stream. */
		(): T;
		/** Sets the value of the stream. */
		(value: T): this;
		/** Creates a dependent stream whose value is set to the result of the callback function. */
		map(f: (current: T) => Stream<T> | T | void): Stream<T>;
		/** Creates a dependent stream whose value is set to the result of the callback function. */
		map<U>(f: (current: T) => Stream<U> | U): Stream<U>;
		/** This method is functionally identical to stream. It exists to conform to Fantasy Land's Applicative specification. */
		of(val?: T): Stream<T>;
		/** Apply. */
		ap<U>(f: Stream<(value: T) => U>): Stream<U>;
		/** A co-dependent stream that unregisters dependent streams when set to true. */
		end: Stream<boolean>;
	}

	type StreamCombiner<T> = (...streams: any[]) => T

	interface StreamFactory {
		/** Creates a stream. */
		<T>(val?: T): Stream<T>;
		/** Creates a computed stream that reactively updates if any of its upstreams are updated. */
		combine<T>(combiner: StreamCombiner<T>, streams: Stream<any>[]): Stream<T>;
		/** Creates a stream whose value is the array of values from an array of streams. */
		merge(streams: Stream<any>[]): Stream<any[]>;
		/** A special value that can be returned to stream callbacks to halt execution of downstreams. */
		HALT: any;
	}
}

declare module 'mithril' {
	const m: M.Static;
	export = m;
}

declare module 'mithril/hyperscript' {
	const h: M.Hyperscript;
	export = h;
}

declare module 'mithril/mount' {
	const m: M.Mount;
	export = m;
}

declare module 'mithril/route' {
	const r: M.Route;
	export = r;
}

declare module 'mithril/request' {
	const r: M.RequestService;
	export = r;
}

declare module 'mithril/render' {
	const r: M.RenderService;
	export = r;
}

declare module 'mithril/redraw' {
	const r: M.RedrawService;
	export = r;
}

declare module 'mithril/util/withAttr' {
	const withAttr: M.WithAttr;
	export = withAttr;
}

declare module 'mithril/stream' {
	const s: M.StreamFactory;
	export = s;
}
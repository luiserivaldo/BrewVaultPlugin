declare module "html-to-pdfmake" {
	import type { Content, Style } from "pdfmake/interfaces";

	export interface HtmlToPdfMakeCustomTagParameters {
		readonly element: Element;
		readonly parents: readonly Element[];
		readonly ret: Record<string, unknown>;
	}

	export interface HtmlToPdfMakeOptions {
		readonly window: Window;
		readonly defaultStyles?: Readonly<Record<string, Style>>;
		readonly tableAutoSize?: boolean;
		readonly imagesByReference?: false;
		readonly removeExtraBlanks?: boolean;
		readonly removeTagClasses?: boolean;
		readonly ignoreStyles?: readonly string[];
		readonly customTag?: (
			parameters: HtmlToPdfMakeCustomTagParameters
		) => Record<string, unknown>;
	}

	export default function htmlToPdfMake(
		html: string,
		options: HtmlToPdfMakeOptions
	): Content;
}

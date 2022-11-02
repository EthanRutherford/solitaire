declare module "*.css" {
	const classes: { [key: string]: string };
	export default classes;
}

declare module "*.svg" {
	import {ComponentType} from "react";
	const svg: ComponentType<Record<string, unknown>>;
	export default svg;
}

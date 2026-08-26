import type { StateCore, Token } from "markdown-it";

const IMAGE_TOKEN_TYPES = new Set(["image", "brew_vault_image"]);
const SIZE_PROPERTIES = new Set([
	"height",
	"max-height",
	"max-width",
	"min-height",
	"min-width",
	"width",
]);
const CSS_SIZE_VALUE = /^(?:auto|0|(?:\d+(?:\.\d+)?|\.\d+)(?:px|%|em|rem|cm|mm|in|pt|pc|vw|vh|vmin|vmax))$/i;

/**
 * Applies Homebrewery-style `{width:...}` size attributes to the image token
 * immediately before them. Only a narrow allowlist of size properties and
 * values is accepted; arbitrary inline CSS never reaches rendered output.
 */
export function imageAttributeRule(state: StateCore): void {
	for (const blockToken of state.tokens) {
		if (blockToken.type !== "inline" || !blockToken.children) continue;
		applyImageAttributes(blockToken.children);
	}
}

export function applyImageAttributes(tokens: Token[]): void {
	for (let index = 0; index < tokens.length - 1; index += 1) {
		const image = tokens[index];
		const following = tokens[index + 1];
		if (!IMAGE_TOKEN_TYPES.has(image.type) || following.type !== "text") continue;

		const attribute = readAttributePrefix(following.content);
		if (!attribute) continue;

		image.attrSet("style", attribute.style);
		following.content = following.content.slice(attribute.consumedLength);
		if (!following.content) {
			tokens.splice(index + 1, 1);
		}
	}
}

export function parseImageSizeStyle(source: string): string | null {
	const declarations = source
		.split(/[;,]/)
		.map((declaration) => declaration.trim())
		.filter(Boolean);
	if (declarations.length === 0) return null;

	const safeDeclarations: string[] = [];
	for (const declaration of declarations) {
		const separator = declaration.indexOf(":");
		if (separator === -1) return null;
		const property = declaration.slice(0, separator).trim().toLowerCase();
		const value = declaration.slice(separator + 1).trim();
		if (!SIZE_PROPERTIES.has(property) || !CSS_SIZE_VALUE.test(value)) return null;
		safeDeclarations.push(`${property}:${value}`);
	}

	return safeDeclarations.join(";");
}

function readAttributePrefix(
	text: string
): { readonly style: string; readonly consumedLength: number } | null {
	const match = /^(\s*)\{([^{}\n]+)\}/.exec(text);
	if (!match) return null;
	const style = parseImageSizeStyle(match[2]);
	if (!style) return null;
	return { style, consumedLength: match[0].length };
}

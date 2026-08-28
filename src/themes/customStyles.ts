import {
	isCustomThemeId,
	type CustomThemeId,
	type ThemeSelectionId,
} from "./registry";

export const CUSTOM_THEME_NAME_TAG = "@brewvault-theme";
export const MAX_CUSTOM_STYLE_BYTES = 256 * 1024;

export interface CustomStyleDefinition {
	id: CustomThemeId;
	name: string;
	css: string;
}

export type CustomStyleValidationResult =
	| { valid: true; css: string }
	| { valid: false; error: string };

export interface CustomStyleSubmission {
	style: CustomStyleDefinition;
	nextCustomStyleNumber: number;
}

/**
 * Validates a self-contained CSS stylesheet before it enters plugin settings or
 * an exported document. CSS remains local: imports and non-data resource URLs
 * are rejected, and closing style tags cannot escape the export's style block.
 */
export function validateCustomStyleCss(css: unknown): CustomStyleValidationResult {
	if (typeof css !== "string" || css.trim().length === 0) {
		return { valid: false, error: "The selected file does not contain CSS." };
	}

	if (new TextEncoder().encode(css).byteLength > MAX_CUSTOM_STYLE_BYTES) {
		return {
			valid: false,
			error: `Custom CSS must be ${MAX_CUSTOM_STYLE_BYTES / 1024} KB or smaller.`,
		};
	}

	if (/\0|<\s*\/\s*style\b/i.test(css)) {
		return { valid: false, error: "Custom CSS contains unsafe markup." };
	}

	const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
	if (/@import(?:\s|\()/i.test(withoutComments)) {
		return { valid: false, error: "Custom CSS cannot import external stylesheets." };
	}

	const resourceError = validateResourceUrls(withoutComments);
	if (resourceError) return { valid: false, error: resourceError };

	if (/expression\s*\(|(?:^|[;{])\s*(?:behavior|-moz-binding)\s*:/i.test(withoutComments)) {
		return { valid: false, error: "Custom CSS contains an unsupported active-CSS feature." };
	}

	const structuralError = findCssStructuralError(css);
	if (structuralError) return { valid: false, error: structuralError };

	if (!withoutComments.includes("{") || !withoutComments.includes("}")) {
		return { valid: false, error: "Custom CSS must contain at least one complete rule." };
	}

	if (typeof CSSStyleSheet !== "undefined") {
		try {
			const sheet = new CSSStyleSheet();
			sheet.replaceSync(css);
			if (sheet.cssRules.length === 0) {
				return { valid: false, error: "The selected file contains no usable CSS rules." };
			}
			const serializedResourceError = validateResourceUrls(
				Array.from(sheet.cssRules, (rule) => rule.cssText).join("\n")
			);
			if (serializedResourceError) {
				return { valid: false, error: serializedResourceError };
			}
			const unscopedSelector = findUnscopedSelector(sheet.cssRules);
			if (unscopedSelector) {
				return {
					valid: false,
					error: `Custom selector "${unscopedSelector}" must include .brewvault-theme-custom.`,
				};
			}
		} catch {
			return { valid: false, error: "The selected file is not valid CSS." };
		}
	}

	return { valid: true, css: `${css.trim()}\n` };
}

/** Extracts the canonical display-name tag from a CSS comment. */
export function extractCustomStyleName(css: string): string | null {
	for (const comment of css.matchAll(/\/\*([\s\S]*?)\*\//g)) {
		const tag = comment[1].match(/(?:^|\s)@brewvault-theme\s*:\s*([^\r\n*]*)/i);
		if (!tag) continue;

		const name = tag[1].trim().replace(/\s+/g, " ");
		if (!name) throw new Error(`${CUSTOM_THEME_NAME_TAG} must include a display name.`);
		if (name.length > 80) throw new Error("Custom style names must be 80 characters or fewer.");
		if ([...name].some((character) => {
			const code = character.charCodeAt(0);
			return code < 32 || code === 127;
		})) {
			throw new Error("Custom style names cannot contain control characters.");
		}
		return name;
	}

	return null;
}

export function createCustomStyleSubmission(
	css: string,
	existingStyles: readonly CustomStyleDefinition[],
	nextCustomStyleNumber: number
): CustomStyleSubmission {
	const validation = validateCustomStyleCss(css);
	if (!validation.valid) throw new Error(validation.error);

	let sequence = normalizeSequence(nextCustomStyleNumber);
	let name = extractCustomStyleName(validation.css);
	if (!name) {
		do {
			name = `Custom_Style_${sequence}`;
			sequence += 1;
		} while (hasStyleName(existingStyles, name));
	} else if (hasStyleName(existingStyles, name)) {
		throw new Error(`A custom style named "${name}" already exists.`);
	}

	return {
		style: {
			id: nextCustomThemeId(existingStyles),
			name,
			css: validation.css,
		},
		nextCustomStyleNumber: sequence,
	};
}

export function findCustomStyle(
	theme: ThemeSelectionId,
	styles: readonly CustomStyleDefinition[]
): CustomStyleDefinition | null {
	if (!isCustomThemeId(theme)) return null;
	return styles.find((style) => style.id === theme) ?? null;
}

export function normalizeStoredCustomStyles(value: unknown): CustomStyleDefinition[] {
	if (!Array.isArray(value)) return [];

	const normalized: CustomStyleDefinition[] = [];
	for (const entry of value) {
		if (!entry || typeof entry !== "object") continue;
		const candidate = entry as Record<string, unknown>;
		if (!isCustomThemeId(candidate.id) || typeof candidate.name !== "string") continue;
		const name = candidate.name.trim().replace(/\s+/g, " ");
		if (!name || name.length > 80 || hasStyleName(normalized, name)) continue;
		if (normalized.some((style) => style.id === candidate.id)) continue;

		const validation = validateCustomStyleCss(candidate.css);
		if (!validation.valid) continue;
		normalized.push({ id: candidate.id, name, css: validation.css });
	}

	return normalized;
}

export function inferNextCustomStyleNumber(
	styles: readonly CustomStyleDefinition[],
	storedSequence: unknown
): number {
	let next = normalizeSequence(storedSequence);
	for (const style of styles) {
		const match = /^Custom_Style_(\d+)$/.exec(style.name);
		if (match) next = Math.max(next, Number(match[1]) + 1);
	}
	return next;
}

function nextCustomThemeId(styles: readonly CustomStyleDefinition[]): CustomThemeId {
	let sequence = 1;
	for (const style of styles) {
		const parsed = Number(style.id.slice("custom:".length));
		if (Number.isSafeInteger(parsed)) sequence = Math.max(sequence, parsed + 1);
	}
	return `custom:${sequence}`;
}

function hasStyleName(styles: readonly CustomStyleDefinition[], name: string): boolean {
	const normalized = name.toLocaleLowerCase();
	return styles.some((style) => style.name.toLocaleLowerCase() === normalized);
}

function normalizeSequence(value: unknown): number {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : 1;
}

function findCssStructuralError(css: string): string | null {
	let braces = 0;
	let parentheses = 0;
	let quote: "'" | '"' | null = null;
	let inComment = false;

	for (let index = 0; index < css.length; index += 1) {
		const char = css[index];
		const next = css[index + 1];
		if (inComment) {
			if (char === "*" && next === "/") {
				inComment = false;
				index += 1;
			}
			continue;
		}
		if (quote) {
			if (char === "\\") index += 1;
			else if (char === quote) quote = null;
			continue;
		}
		if (char === "/" && next === "*") {
			inComment = true;
			index += 1;
		} else if (char === "'" || char === '"') {
			quote = char;
		} else if (char === "{") {
			braces += 1;
		} else if (char === "}") {
			braces -= 1;
			if (braces < 0) return "Custom CSS contains an unmatched closing brace.";
		} else if (char === "(") {
			parentheses += 1;
		} else if (char === ")") {
			parentheses -= 1;
			if (parentheses < 0) return "Custom CSS contains an unmatched closing parenthesis.";
		}
	}

	if (inComment) return "Custom CSS contains an unterminated comment.";
	if (quote) return "Custom CSS contains an unterminated string.";
	if (braces !== 0) return "Custom CSS contains unbalanced braces.";
	if (parentheses !== 0) return "Custom CSS contains unbalanced parentheses.";
	return null;
}

function findUnscopedSelector(rules: CSSRuleList): string | null {
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSStyleRule) {
			const selectors = splitSelectorList(rule.selectorText);
			const unscoped = selectors.find(
				(selector) => !selector.includes(".brewvault-theme-custom")
			);
			if (unscoped) return unscoped.trim();
		}

		if ("cssRules" in rule) {
			const nested = (rule as CSSGroupingRule).cssRules;
			const unscoped = findUnscopedSelector(nested);
			if (unscoped) return unscoped;
		}
	}
	return null;
}

function validateResourceUrls(css: string): string | null {
	for (const match of css.matchAll(/url\s*\(\s*([^)]*?)\s*\)/gi)) {
		const resource = match[1].trim().replace(/^(['"])(.*)\1$/, "$2").trim();
		if (!resource.toLowerCase().startsWith("data:")) {
			return "Custom CSS resource URLs must be embedded data URLs.";
		}
	}
	return null;
}

function splitSelectorList(selectorText: string): string[] {
	const selectors: string[] = [];
	let start = 0;
	let parentheses = 0;
	let brackets = 0;
	let quote: "'" | '"' | null = null;

	for (let index = 0; index < selectorText.length; index += 1) {
		const char = selectorText[index];
		if (quote) {
			if (char === "\\") index += 1;
			else if (char === quote) quote = null;
			continue;
		}
		if (char === "'" || char === '"') quote = char;
		else if (char === "(") parentheses += 1;
		else if (char === ")") parentheses -= 1;
		else if (char === "[") brackets += 1;
		else if (char === "]") brackets -= 1;
		else if (char === "," && parentheses === 0 && brackets === 0) {
			selectors.push(selectorText.slice(start, index));
			start = index + 1;
		}
	}
	selectors.push(selectorText.slice(start));
	return selectors;
}

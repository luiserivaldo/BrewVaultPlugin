import assert from "node:assert/strict";
import test from "node:test";
import {
	clearTimeout as clearNodeTimeout,
	setTimeout as setNodeTimeout,
} from "node:timers";
import {
	dimensionsOverflow,
	type TimerHost,
	waitForImageReadiness,
} from "../src/renderer/paginateDom";

const nodeTimerHost: TimerHost = {
	setTimeout: (callback, timeoutMs) => setNodeTimeout(callback, timeoutMs),
	clearTimeout: (handle) =>
		clearNodeTimeout(handle as ReturnType<typeof setNodeTimeout>),
};

void test("detects horizontal column overflow on the measured wrapper", () => {
	assert.equal(
		dimensionsOverflow({
			scrollWidth: 1_020,
			clientWidth: 680,
			scrollHeight: 940,
			clientHeight: 940,
		}),
		true
	);
});

void test("ignores decorative bleed from a framed block in the right column", () => {
	// Measured in Chromium: a PHB monster frame in column 2 widens the
	// wrapper's scroll area from 672px to 678px.
	assert.equal(
		dimensionsOverflow({
			scrollWidth: 678,
			clientWidth: 672,
			scrollHeight: 928,
			clientHeight: 928,
		}),
		false
	);
});

void test("still detects vertical overflow of a single pixel or more", () => {
	assert.equal(
		dimensionsOverflow({
			scrollWidth: 672,
			clientWidth: 672,
			scrollHeight: 930,
			clientHeight: 928,
		}),
		true
	);
});

void test("waits for an embedded image to decode before measuring", async () => {
	let decoded = false;
	await waitForImageReadiness({
		complete: false,
		decode: async () => {
			decoded = true;
		},
	}, 100, nodeTimerHost);

	assert.equal(decoded, true);
});

void test("falls back to image load events when decode is unavailable", async () => {
	const listeners = new Map<string, () => void>();
	const waiting = waitForImageReadiness(
		{
			complete: false,
			addEventListener: (type, listener) => listeners.set(type, listener),
			removeEventListener: (type) => listeners.delete(type),
		},
		100,
		nodeTimerHost
	);

	listeners.get("load")?.();
	await waiting;
	assert.equal(listeners.size, 0);
});

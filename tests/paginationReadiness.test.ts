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

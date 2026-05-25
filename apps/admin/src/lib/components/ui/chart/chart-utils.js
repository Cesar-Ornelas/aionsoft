import { getContext, setContext } from "svelte";

export const THEMES = { light: "", dark: ".dark" };

export function getPayloadConfigFromPayload(config, payload, key, data = null) {
	if (typeof payload !== "object" || payload === null) return undefined;

	const payloadConfig =
		"config" in payload && typeof payload.config === "object" && payload.config !== null
			? payload.config
			: undefined;

	let configLabelKey = key;

	if (payload.key === key) {
		configLabelKey = payload.key;
	} else if (payload.label === key) {
		configLabelKey = payload.label;
	} else if (key in payload && typeof payload[key] === "string") {
		configLabelKey = payload[key];
	} else if (
		payloadConfig !== undefined &&
		key in payloadConfig &&
		typeof payloadConfig[key] === "string"
	) {
		configLabelKey = payloadConfig[key];
	} else if (data != null && typeof data === "object" && key in data && typeof data[key] === "string") {
		configLabelKey = data[key];
	}

	return configLabelKey in config ? config[configLabelKey] : config[key];
}

const chartContextKey = Symbol("chart-context");

export function setChartContext(value) {
	return setContext(chartContextKey, value);
}

export function useChart() {
	return getContext(chartContextKey);
}
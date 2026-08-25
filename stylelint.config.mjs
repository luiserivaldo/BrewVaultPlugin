export default {
	plugins: ["stylelint-no-unsupported-browser-features"],
	rules: {
		"plugin/no-unsupported-browser-features": [
			true,
			{
				browsers: ["electron >= 30"],
				severity: "warning",
			},
		],
	},
};

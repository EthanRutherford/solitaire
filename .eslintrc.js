module.exports = {
	extends: ["@rutherford", "plugin:storybook/recommended"],
	parserOptions: {
		tsconfigRootDir: __dirname,
		project: ["./tsconfig.json"],
	},
};

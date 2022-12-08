const getConfig = require("../webpack.config");
const ourConfig = getConfig()[0];
const ourRules = ourConfig.module.rules;
const ourPlugins = ourConfig.plugins;

module.exports = {
	stories: [
		"../src/**/*.stories.mdx",
		"../src/**/*.stories.@(js|jsx|ts|tsx)",
	],
	addons: [
		"@storybook/addon-links",
		"@storybook/addon-essentials",
		"@storybook/addon-interactions",
	],
	framework: "@storybook/react",
	core: {
		builder: "@storybook/builder-webpack5",
	},
	webpackFinal: async (config) => {
		// replace their rules with ours, and append our plugins
		config.module.rules = ourRules;
		config.plugins.push(...ourPlugins);
		return config;
	  },
};

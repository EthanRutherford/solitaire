import {ComponentStory, ComponentMeta} from "@storybook/react";
import {seedRandom} from "../../util/random";
import {Board} from "./board";

seedRandom("storybook");

export default {
	title: "Free Cell",
	component: Board,
	parameters: {
		docs: {page: null},
		options: {showPanel: false},
	},
	decorators: [
		(Story) => (
			<div style={{position: "fixed", inset: 0}}>
				<Story />
			</div>
		),
	],
} satisfies ComponentMeta<typeof Board>;

const Template: ComponentStory<typeof Board> = (args) => <Board {...args} />;

export const Default = Template.bind({});

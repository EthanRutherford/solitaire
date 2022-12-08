import {ComponentStory, ComponentMeta} from "@storybook/react";
import {ControlBar} from "./control-bar";

export default {
	title: ControlBar.name,
	component: ControlBar,
	decorators: [
		(Story) => (
			<div style={{position: "relative", height: "50px"}}>
				<div style={{position: "absolute", inset: 0}}>
					<Story />
				</div>
			</div>
		),
	],
	parameters: {
		controls: {hideNoControlsWarning: true},
	},
	argTypes: {
		newGame: {table: {disable: true}},
		undo: {table: {disable: true}},
		redo: {table: {disable: true}},
	},
} satisfies ComponentMeta<typeof ControlBar>;

const Template: ComponentStory<typeof ControlBar> = (args) => (<ControlBar {...args} />);

export const Default = Template.bind({});

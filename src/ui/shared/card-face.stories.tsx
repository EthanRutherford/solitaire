import {ComponentStory, ComponentMeta} from "@storybook/react";
import Spade from "../../../images/spade.svg";
import Diamond from "../../../images/diamond.svg";
import Club from "../../../images/club.svg";
import Heart from "../../../images/heart.svg";
import {CardFace} from "./card-face";

export default {
	title: CardFace.name,
	component: CardFace,
	argTypes: {
		Icon: {
			options: ["Spade", "Diamond", "Club", "Heart"],
			mapping: {Spade, Diamond, Club, Heart},
		},
	},
} satisfies ComponentMeta<typeof CardFace>;

const Template: ComponentStory<typeof CardFace> = (args) => (
	<div style={{position: "relative", width: 100, height: 150}}>
		<CardFace {...args} />
	</div>
);

export const Default = Template.bind({});
Default.args = {
	Icon: Spade,
	value: 1,
};

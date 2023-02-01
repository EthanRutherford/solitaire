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
		value: {table: {disable: true}},
	},
} satisfies ComponentMeta<typeof CardFace>;

const Template: ComponentStory<typeof CardFace> = (args) => (
	<div style={{display: "flex", flexWrap: "wrap"}}>
		<div style={{position: "relative", width: 100, height: 150}}>
			<CardFace {...args} value={1} />
		</div>
		<div style={{position: "relative", width: 100, height: 150}}>
			<CardFace {...args} value={2} />
		</div>
		<div style={{position: "relative", width: 100, height: 150}}>
			<CardFace {...args} value={3} />
		</div>
		<div style={{position: "relative", width: 100, height: 150}}>
			<CardFace {...args} value={4} />
		</div>
		<div style={{position: "relative", width: 100, height: 150}}>
			<CardFace {...args} value={5} />
		</div>
		<div style={{position: "relative", width: 100, height: 150}}>
			<CardFace {...args} value={6} />
		</div>
		<div style={{position: "relative", width: 100, height: 150}}>
			<CardFace {...args} value={7} />
		</div>
		<div style={{position: "relative", width: 100, height: 150}}>
			<CardFace {...args} value={8} />
		</div>
		<div style={{position: "relative", width: 100, height: 150}}>
			<CardFace {...args} value={9} />
		</div>
		<div style={{position: "relative", width: 100, height: 150}}>
			<CardFace {...args} value={10} />
		</div>
		<div style={{position: "relative", width: 100, height: 150}}>
			<CardFace {...args} value={11} />
		</div>
		<div style={{position: "relative", width: 100, height: 150}}>
			<CardFace {...args} value={12} />
		</div>
		<div style={{position: "relative", width: 100, height: 150}}>
			<CardFace {...args} value={13} />
		</div>
	</div>
);

export const Default = Template.bind({});
Default.args = {
	Icon: Spade,
};

import {ComponentStory, ComponentMeta} from "@storybook/react";
import {Card as CardType, Suit} from "../../logic/deck";
import {Card} from "./card";

export default {
	title: Card.name,
	component: Card,
	argTypes: {
		card: {table: {disable: true}},
		onTap: {table: {disable: true}},
		onDoubleTap: {table: {disable: true}},
		getDragCards: {table: {disable: true}},
		// in order to get nice controls for subProperties,
		// we have to mock them in ourselves
		// @ts-expect-error
		"card.suit": {
			options: ["Spades", "Diamonds", "Clubs", "Hearts"],
			mapping: {Spades: Suit.Spades, Diamonds: Suit.Diamonds, Clubs: Suit.Clubs, Hearts: Suit.Hearts},
			control: "select",
			defaultValue: Suit.Spades,
		},
		"card.value": {
			options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
			control: "select",
			defaultValue: 1,
		},
		"card.faceUp": {control: "boolean", defaultValue: true},
	},
} satisfies ComponentMeta<typeof Card>;

type AugmentedCard = typeof Card & {"card.suit": number; "card.value": number; "card.faceUp": boolean};
const Template: ComponentStory<AugmentedCard> = (args) => (
	// @ts-expect-error yes, I know these aren't actual props
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	<Card card={new CardType(args["card.suit"], args["card.value"], args["card.faceUp"])} pos={args.pos} />
);

export const Default = Template.bind({});
Default.args = {
	pos: {x: 0, y: 0, z: 0},
};

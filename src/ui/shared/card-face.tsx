import {ComponentType, useMemo} from "react";
import JackHat from "../../../images/faces/jack-hat.svg";
import QueenHat from "../../../images/faces/queen-hat.svg";
import KingHat from "../../../images/faces/king-hat.svg";
import {CardValue} from "../../logic/deck";
import {useSizes} from "./sizerator";
import styles from "./card-face.css";

const hats = [JackHat, QueenHat, KingHat];

function renderFaceCard(Icon: ComponentType, value: CardValue, smallCard: boolean) {
	const className = `${styles.cardFace} ${styles[`c${value}`]}`;
	const HatIcon = hats[value - 11];

	return (
		<div className={className}>
			<HatIcon />
			{!smallCard && <><Icon /><Icon /></>}
		</div>
	);
}

function renderNumberCard(Icon: ComponentType, value: CardValue) {
	const icons = [];
	for (let i = 0; i < value; i++) {
		icons.push(<Icon key={i} />);
	}

	const className = `${styles.cardFace} ${styles[`c${value}`]}`;
	return (
		<div className={className}>{icons}</div>
	);
}

export function CardFace({Icon, value}: {Icon: ComponentType, value: CardValue}) {
	const {cardWidth} = useSizes();
	const smallCard = cardWidth < 50;
	const output = useMemo(() => {
		if (value > 10) {
			return renderFaceCard(Icon, value, smallCard);
		}

		return renderNumberCard(Icon, smallCard ? 1 : value);
	}, [Icon, value, smallCard]);

	return output;
}

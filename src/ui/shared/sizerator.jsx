import {createContext, useContext, useEffect} from "react";
import {useRerender} from "../../util/use-rerender";

const SizeContext = createContext({});
const cardRatio = 1.5;

export function Sizerator({cardsAcross, cardsTall, children}) {
	const rerender = useRerender();
	useEffect(() => {
		window.onresize = rerender;
	}, []);

	const {clientWidth: width, clientHeight: height} = document.documentElement;
	const margins = width < 600 ? 5 : 10;
	const barHeight = Math.floor(height * .075);

	const totalXMargin = (cardsAcross + 1) * margins;
	const totalYMargin = (cardsTall + 1) * margins;
	const maxCardWidth = (width - totalXMargin) / cardsAcross;
	const maxCardHeight = (height - totalYMargin - barHeight) / cardsTall;

	const dims = maxCardWidth * cardRatio < maxCardHeight ?
		[maxCardWidth, maxCardWidth * cardRatio] :
		[maxCardHeight / cardRatio, maxCardHeight];
	const [cardWidth, cardHeight] = dims.map((d) => Math.floor(d));
	const cardOffsetX = cardWidth + margins;
	const cardOffsetY = cardHeight + margins;
	const boardWidth = margins + cardOffsetX * cardsAcross;
	const boardHeight = margins + cardOffsetY * cardsTall;

	return (
		<SizeContext.Provider
			value={{
				margins,
				cardWidth, cardHeight,
				cardOffsetX, cardOffsetY,
				boardWidth, boardHeight,
			}}
		>
			<div
				style={{
					width: "100%",
					height: "100%",
					"--margin": `${margins}px`,
					"--card-width": `${cardWidth}px`,
					"--card-height": `${cardHeight}px`,
					"--board-width": `${boardWidth}px`,
					"--bar-height": `${barHeight}px`,
				}}
			>
				{children}
			</div>
		</SizeContext.Provider>
	);
}

export function useSizes() {
	return useContext(SizeContext);
}

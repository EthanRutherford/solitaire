import {createContext, useCallback, useContext, useEffect, useState} from "react";

const SizeContext = createContext({});
const cardRatio = 1.5;

export function sizerated(cardsAcross, cardsTall, Component) {
	return function Sizerator(props) {
		const computeSizes = useCallback(() => {
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

			return {margins, cardWidth, cardHeight, cardOffsetX, cardOffsetY, boardWidth, boardHeight, barHeight};
		}, [cardsAcross, cardsTall]);

		const [sizes, setSizes] = useState(computeSizes);
		useEffect(() => {
			const resize = () => setSizes(computeSizes());
			window.addEventListener("resize", resize);
			return () => window.removeEventListener("resize", resize);
		}, []);

		return (
			<SizeContext.Provider
				value={sizes}
			>
				<div
					style={{
						width: "100%",
						height: "100%",
						"--margin": `${sizes.margins}px`,
						"--card-width": `${sizes.cardWidth}px`,
						"--card-height": `${sizes.cardHeight}px`,
						"--board-width": `${sizes.boardWidth}px`,
						"--bar-height": `${sizes.barHeight}px`,
					}}
				>
					<Component {...props} />
				</div>
			</SizeContext.Provider>
		);
	};
}

export function useSizes() {
	return useContext(SizeContext);
}

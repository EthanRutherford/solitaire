import {AppRouter} from "../src/ui/shared/app-router";
import {SizeContextFORTESTINGPURPOSESONLY} from "../src/ui/shared/sizerator";
import "../src/main.css";

const FakeSizerator = ({children}) => (
	<SizeContextFORTESTINGPURPOSESONLY.Provider
		value={{
			margins: 10, cardWidth: 100, cardHeight: 150,
			cardOffsetX: 110, cardOffsetY: 160,
			boardWidth: 890, boardHeight: 650, barHeight: 30,
		}}
	>
		<div
			style={{
				width: "100%",
				height: "100%",
				"--margin": `${10}px`,
				"--card-width": `${100}px`,
				"--card-height": `${150}px`,
				"--board-width": `${890}px`,
				"--bar-height": `${50}px`,
			}}
		>
			{children}
		</div>
	</SizeContextFORTESTINGPURPOSESONLY.Provider>
);

export const parameters = {
	actions: {argTypesRegex: "^on[A-Z].*"},
	controls: {
		matchers: {
			color: /(background|color)$/i,
			date: /Date$/,
		},
	},
	options: {showPanel: true},
};

export const decorators = [
	(Story) => (
		<div style={{position: "relative"}}>
			<AppRouter>
				<FakeSizerator>
					<Story />
				</FakeSizerator>
			</AppRouter>
		</div>
	),
];

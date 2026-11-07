"use client";

import { CarbPanel } from "./components/CarbPanel";
import { ConversionPanel } from "./components/ConversionPanel";
import { RacePanel } from "./components/RacePanel";

export default function Home(): React.JSX.Element {
	return (
		<main className="shell">
			<section className="hero">
				<h1 className="heroTitle">Mileage Toolkit</h1>
			</section>
			<RacePanel />
			<CarbPanel />
			<ConversionPanel />
		</main>
	);
}

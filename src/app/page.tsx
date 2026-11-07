"use client";

import { CarbPanel } from "./components/CarbPanel";
import { ConversionPanel } from "./components/ConversionPanel";
import { RacePanel } from "./components/RacePanel";

export default function Home(): React.JSX.Element {
	return (
		<main className="shell">
			<section className="hero">
				<h1 className="heroTitle">Mileage Toolkit</h1>
				<p>one result for race clocks and training paces, plus fueling and conversions</p>
			</section>
			<RacePanel />
			<CarbPanel />
			<ConversionPanel />
		</main>
	);
}

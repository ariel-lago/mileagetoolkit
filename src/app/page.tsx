"use client";

import { CarbPanel } from "./components/CarbPanel";
import { ConversionPanel } from "./components/ConversionPanel";
import { KitPanel } from "./components/KitPanel";
import { RacePanel } from "./components/RacePanel";

export default function Home(): React.JSX.Element {
	return (
		<main className="shell">
			<section className="hero">
				<h1 className="heroTitle">
					<span>Mileage</span>
					<span>Toolkit</span>
				</h1>
			</section>
			<RacePanel />
			<CarbPanel />
			<KitPanel />
			<ConversionPanel />
		</main>
	);
}

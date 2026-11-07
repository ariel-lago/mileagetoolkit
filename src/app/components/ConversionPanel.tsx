"use client";

import { useMemo, useState } from "react";
import { kmToMiles, milesToKm, paceKmToMile, paceMileToKm } from "../utils/calculators";
import { fieldLook, formatPace, parseNonNegative, parsePaceField } from "./fields";

export function ConversionPanel(): React.JSX.Element {
	const [converterKm, setConverterKm] = useState("");
	const [converterMiles, setConverterMiles] = useState("");
	const [pacePerKm, setPacePerKm] = useState("");
	const [pacePerMile, setPacePerMile] = useState("");

	const converterTool = useMemo(() => {
		const km = parseNonNegative(converterKm);
		const miles = parseNonNegative(converterMiles);
		const secondsPerKm = parsePaceField(pacePerKm);
		const secondsPerMile = parsePaceField(pacePerMile);

		return {
			kmToMiles: km !== null ? kmToMiles(km) : null,
			milesToKm: miles !== null ? milesToKm(miles) : null,
			secondsPerMileFromKm: secondsPerKm > 0 ? paceKmToMile(secondsPerKm) : 0,
			secondsPerKmFromMile: secondsPerMile > 0 ? paceMileToKm(secondsPerMile) : 0
		};
	}, [converterKm, converterMiles, pacePerKm, pacePerMile]);

	return (
		<section className="panel">
			<h2 className="toolTitle">Conversions</h2>
			<div className="convertGrid">
				<div className="convertStack">
					<label>
						Kilometers to miles
						<input
							type="number"
							min={0}
							value={converterKm}
							onChange={(event) => setConverterKm(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							{...fieldLook(converterKm)}
						/>
					</label>
					<label>
						Miles to kilometers
						<input
							type="number"
							min={0}
							value={converterMiles}
							onChange={(event) => setConverterMiles(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							{...fieldLook(converterMiles)}
						/>
					</label>
				</div>
				<div className="convertStack">
					<label>
						Pace per km
						<input
							type="text"
							inputMode="text"
							value={pacePerKm}
							onChange={(event) => setPacePerKm(event.target.value.replace(/[^\d:]/g, "").slice(0, 5))}
							onFocus={(event) => event.currentTarget.select()}
							{...fieldLook(pacePerKm)}
						/>
						<span className="clockHint">mm:ss</span>
					</label>
					<label>
						Pace per mile
						<input
							type="text"
							inputMode="text"
							value={pacePerMile}
							onChange={(event) => setPacePerMile(event.target.value.replace(/[^\d:]/g, "").slice(0, 5))}
							onFocus={(event) => event.currentTarget.select()}
							{...fieldLook(pacePerMile)}
						/>
						<span className="clockHint">mm:ss</span>
					</label>
				</div>
			</div>

			<div className="cards">
				<article className="card">
					<h3>Distance</h3>
					<p className="convertLine">{converterTool.kmToMiles === null ? "—" : `${converterKm} km = ${converterTool.kmToMiles.toFixed(2)} mi`}</p>
					<p className="convertLine">{converterTool.milesToKm === null ? "—" : `${converterMiles} mi = ${converterTool.milesToKm.toFixed(2)} km`}</p>
				</article>
				<article className="card">
					<h3>Pace</h3>
					<p className="convertLine">{converterTool.secondsPerMileFromKm > 0 ? `${pacePerKm} /km = ${formatPace(converterTool.secondsPerMileFromKm)} /mi` : "—"}</p>
					<p className="convertLine">{converterTool.secondsPerKmFromMile > 0 ? `${pacePerMile} /mi = ${formatPace(converterTool.secondsPerKmFromMile)} /km` : "—"}</p>
				</article>
			</div>
		</section>
	);
}

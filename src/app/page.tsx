"use client";

import { useMemo, useState } from "react";
import {
	calculateCarbFueling,
	calculateTrainingPaces,
	formatDuration,
	kmToMiles,
	milesToKm,
	parseDuration,
	paceKmToMile,
	paceMileToKm,
	projectAllRaceDistances,
	type CarbSessionIntensity
} from "./utils/calculators";

const intensitySteps: Array<{ label: string; value: CarbSessionIntensity }> = [
	{ label: "Easy", value: "easy" },
	{ label: "Steady", value: "steady" },
	{ label: "Tempo/Threshold", value: "tempo" },
	{ label: "Hard", value: "hard" },
	{ label: "Race", value: "race" }
];

function parseDistanceInput(value: string): number | null {
	const normalized = value.trim().toLowerCase();

	const aliases: Record<string, number> = {
		"5k": 5,
		"10k": 10,
		half: 21.0975,
		"half marathon": 21.0975,
		hm: 21.0975,
		marathon: 42.195,
		marathin: 42.195,
		full: 42.195,
		"full marathon": 42.195
	};

	if (normalized in aliases) {
		return aliases[normalized];
	}

	const parsed = Number(normalized);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}

	return parsed;
}

function formatPace(secondsPerUnit: number): string {
	const rounded = Math.round(secondsPerUnit);
	const minutes = Math.floor(rounded / 60);
	const seconds = rounded % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function parsePositive(value: string): number | null {
	if (!value.trim()) {
		return null;
	}
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}
	return parsed;
}

function parseNonNegative(value: string): number | null {
	if (!value.trim()) {
		return null;
	}
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return null;
	}
	return parsed;
}

export default function Home(): React.JSX.Element {
	const [raceDistanceInput, setRaceDistanceInput] = useState("");
	const [raceMinutes, setRaceMinutes] = useState("");
	const [raceSeconds, setRaceSeconds] = useState("");
	const [raceWeeklyVolumeKm, setRaceWeeklyVolumeKm] = useState("");

	const [paceDistanceInput, setPaceDistanceInput] = useState("");
	const [paceMinutes, setPaceMinutes] = useState("");
	const [paceSeconds, setPaceSeconds] = useState("");

	const [weightKg, setWeightKg] = useState("");
	const [effortHours, setEffortHours] = useState("");
	const [effortMinutesPart, setEffortMinutesPart] = useState("");
	const [intensityIndex, setIntensityIndex] = useState(1);

	const [converterKm, setConverterKm] = useState("");
	const [converterMiles, setConverterMiles] = useState("");
	const [pacePerKmMin, setPacePerKmMin] = useState("");
	const [pacePerKmSec, setPacePerKmSec] = useState("");
	const [pacePerMileMin, setPacePerMileMin] = useState("");
	const [pacePerMileSec, setPacePerMileSec] = useState("");

	const intensity = intensitySteps[intensityIndex]?.value ?? "steady";

	const raceTool = useMemo(() => {
		if (!raceDistanceInput.trim() || !raceMinutes.trim() || !raceSeconds.trim() || !raceWeeklyVolumeKm.trim()) {
			return { ok: false as const, error: "Enter distance, time, and weekly volume." };
		}

		const knownDistanceKm = parseDistanceInput(raceDistanceInput);
		if (!knownDistanceKm) {
			return { ok: false as const, error: "Race distance is invalid." };
		}

		const raceMinutesNum = parseNonNegative(raceMinutes);
		const raceSecondsNum = parseNonNegative(raceSeconds);
		const weeklyVolumeNum = parsePositive(raceWeeklyVolumeKm);
		if (raceMinutesNum === null || raceSecondsNum === null || weeklyVolumeNum === null) {
			return { ok: false as const, error: "Race time and weekly volume must be valid numbers." };
		}

		if (raceSecondsNum >= 60) {
			return { ok: false as const, error: "Race time must be valid minutes + seconds (0-59)." };
		}

		const knownTimeSeconds = raceMinutesNum * 60 + raceSecondsNum;
		const predictions = projectAllRaceDistances(knownTimeSeconds, knownDistanceKm, {
			weeklyVolumeKm: weeklyVolumeNum
		});

		return {
			ok: true as const,
			knownDistanceKm,
			knownTimeSeconds,
			predictions
		};
	}, [raceDistanceInput, raceMinutes, raceSeconds, raceWeeklyVolumeKm]);

	const paceTool = useMemo(() => {
		if (!paceDistanceInput.trim() || !paceMinutes.trim() || !paceSeconds.trim()) {
			return { ok: false as const, error: "Enter distance and time for pace suggestions." };
		}

		const knownDistanceKm = parseDistanceInput(paceDistanceInput);
		if (!knownDistanceKm) {
			return { ok: false as const, error: "Pace tool distance is invalid." };
		}

		const paceMinutesNum = parseNonNegative(paceMinutes);
		const paceSecondsNum = parseNonNegative(paceSeconds);
		if (paceMinutesNum === null || paceSecondsNum === null) {
			return { ok: false as const, error: "Pace tool time must be valid numbers." };
		}

		if (paceSecondsNum >= 60) {
			return { ok: false as const, error: "Pace tool time must be valid minutes + seconds (0-59)." };
		}

		const knownTimeSeconds = paceMinutesNum * 60 + paceSecondsNum;
		if (knownTimeSeconds <= 0) {
			return { ok: false as const, error: "Pace tool time must be greater than zero." };
		}

		const paces = calculateTrainingPaces(knownTimeSeconds, knownDistanceKm);

		return {
			ok: true as const,
			knownDistanceKm,
			knownTimeSeconds,
			paces
		};
	}, [paceDistanceInput, paceMinutes, paceSeconds]);

	const carbTool = useMemo(() => {
		if (!weightKg.trim() || !effortHours.trim() || !effortMinutesPart.trim()) {
			return { ok: false as const, error: "Enter weight and duration (hours + minutes)." };
		}

		const weightKgNum = parsePositive(weightKg);
		const effortHoursNum = parseNonNegative(effortHours);
		const effortMinutesNum = parseNonNegative(effortMinutesPart);
		if (weightKgNum === null || effortHoursNum === null || effortMinutesNum === null) {
			return {
				ok: false as const,
				error: "Weight must be positive and duration must be valid (hours + minutes where minutes are 0-59)."
			};
		}

		if (effortMinutesNum >= 60) {
			return { ok: false as const, error: "Duration minutes must be between 0 and 59." };
		}

		const effortDurationMinutes = parseDuration(`${effortHoursNum}:${effortMinutesNum}:00`) / 60;
		if (effortDurationMinutes <= 0) {
			return { ok: false as const, error: "Session duration must be greater than zero." };
		}

		const carbs = calculateCarbFueling(weightKgNum, effortDurationMinutes, {
			sessionIntensity: intensity
		});

		return {
			ok: true as const,
			effortDurationMinutes,
			carbs
		};
	}, [weightKg, effortHours, effortMinutesPart, intensity]);

	const converterTool = useMemo(() => {
		const km = parseNonNegative(converterKm);
		const miles = parseNonNegative(converterMiles);
		const pacePerKmMinNum = parseNonNegative(pacePerKmMin);
		const pacePerKmSecNum = parseNonNegative(pacePerKmSec);
		const pacePerMileMinNum = parseNonNegative(pacePerMileMin);
		const pacePerMileSecNum = parseNonNegative(pacePerMileSec);

		const secondsPerKm = pacePerKmMinNum !== null && pacePerKmSecNum !== null
			? Math.max(0, pacePerKmMinNum * 60 + pacePerKmSecNum)
			: 0;
		const secondsPerMile = pacePerMileMinNum !== null && pacePerMileSecNum !== null
			? Math.max(0, pacePerMileMinNum * 60 + pacePerMileSecNum)
			: 0;

		return {
			kmToMiles: km !== null ? kmToMiles(km) : null,
			milesToKm: miles !== null ? milesToKm(miles) : null,
			secondsPerMileFromKm: secondsPerKm > 0 ? paceKmToMile(secondsPerKm) : 0,
			secondsPerKmFromMile: secondsPerMile > 0 ? paceMileToKm(secondsPerMile) : 0
		};
	}, [converterKm, converterMiles, pacePerKmMin, pacePerKmSec, pacePerMileMin, pacePerMileSec]);

	return (
		<main className="shell">
			<section className="hero">
				<h1>Running Performance Toolkit</h1>
				<p>Independent tools for race prediction, training paces, fueling, and conversions.</p>
			</section>

			<section className="panel">
				<h2>Race Prediction Tool</h2>
				<div className="grid">
					<label>
						Known race distance
						<input
							type="text"
							value={raceDistanceInput}
							onChange={(event) => setRaceDistanceInput(event.target.value)}
							placeholder="5k, 10k, half, marathon, or km"
						/>
					</label>
					<label>
						Known time minutes
						<input
							type="number"
							min={0}
							value={raceMinutes}
							onChange={(event) => setRaceMinutes(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							placeholder="21"
						/>
					</label>
					<label>
						Known time seconds
						<input
							type="number"
							min={0}
							max={59}
							value={raceSeconds}
							onChange={(event) => setRaceSeconds(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							placeholder="40"
						/>
					</label>
					<label>
						Weekly volume (km)
						<input
							type="number"
							min={1}
							value={raceWeeklyVolumeKm}
							onChange={(event) => setRaceWeeklyVolumeKm(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							placeholder="45"
						/>
					</label>
				</div>

				{!raceTool.ok ? (
					<p className="toolError">{raceTool.error}</p>
				) : (
					<>
						<p>
							Known performance: {raceTool.knownDistanceKm} km in {formatDuration(raceTool.knownTimeSeconds)}
						</p>
						<div className="cards">
							<article className="card">
								<h3>5K</h3>
								<p>{raceTool.predictions.fiveK.displayTimeRange}</p>
								<small>{formatDuration(raceTool.predictions.fiveK.midSeconds)}</small>
							</article>
							<article className="card">
								<h3>10K</h3>
								<p>{raceTool.predictions.tenK.displayTimeRange}</p>
								<small>{formatDuration(raceTool.predictions.tenK.midSeconds)}</small>
							</article>
							<article className="card">
								<h3>Half Marathon</h3>
								<p>{raceTool.predictions.halfMarathon.displayTimeRange}</p>
								<small>{formatDuration(raceTool.predictions.halfMarathon.midSeconds)}</small>
							</article>
							<article className="card">
								<h3>Marathon</h3>
								<p>{raceTool.predictions.marathon.displayTimeRange}</p>
								<small>{formatDuration(raceTool.predictions.marathon.midSeconds)}</small>
							</article>
						</div>
					</>
				)}
			</section>

			<section className="panel">
				<h2>Training Pace Tool</h2>
				<div className="grid">
					<label>
						Reference distance
						<input
							type="text"
							value={paceDistanceInput}
							onChange={(event) => setPaceDistanceInput(event.target.value)}
							placeholder="5k, 10k, half, or km"
						/>
					</label>
					<label>
						Reference time minutes
						<input
							type="number"
							min={0}
							value={paceMinutes}
							onChange={(event) => setPaceMinutes(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							placeholder="50"
						/>
					</label>
					<label>
						Reference time seconds
						<input
							type="number"
							min={0}
							max={59}
							value={paceSeconds}
							onChange={(event) => setPaceSeconds(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							placeholder="00"
						/>
					</label>
				</div>

				{!paceTool.ok ? (
					<p className="toolError">{paceTool.error}</p>
				) : (
					<>
						<p>
							Reference: {paceTool.knownDistanceKm} km in {formatDuration(paceTool.knownTimeSeconds)}
						</p>
						<div className="paceTable">
							{paceTool.paces.zones.map((zone) => (
								<div className="paceRow" key={zone.name}>
									<strong>{zone.name}</strong>
									<span>{zone.labelPerKm}</span>
									<span>{zone.labelPerMile}</span>
								</div>
							))}
						</div>
					</>
				)}
			</section>

			<section className="panel">
				<h2>Carb Fueling Tool</h2>
				<div className="grid">
					<label>
						Body weight (kg)
						<input
							type="number"
							min={1}
							value={weightKg}
							onChange={(event) => setWeightKg(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							placeholder="70"
						/>
					</label>
					<label>
						Session duration hours
						<input
							type="number"
							min={0}
							value={effortHours}
							onChange={(event) => setEffortHours(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							placeholder="2"
						/>
					</label>
					<label>
						Session duration minutes
						<input
							type="number"
							min={0}
							max={59}
							value={effortMinutesPart}
							onChange={(event) => setEffortMinutesPart(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							placeholder="30"
						/>
					</label>
				</div>

				<div className="sliderWrap">
					<label htmlFor="effort">Session effort (slider)</label>
					<input
						id="effort"
						type="range"
						min={0}
						max={intensitySteps.length - 1}
						step={1}
						value={intensityIndex}
						onChange={(event) => setIntensityIndex(Number(event.target.value))}
					/>
					<div className="ticks">
						{intensitySteps.map((item, index) => (
							<span key={item.value} className={index === intensityIndex ? "active" : ""}>
								{item.label}
							</span>
						))}
					</div>
				</div>

				{!carbTool.ok ? (
					<p className="toolError">{carbTool.error}</p>
				) : (
					<>
						<p>Total duration: {carbTool.effortDurationMinutes} min</p>
						<p>{carbTool.carbs.highCarbMessage}</p>
						<p>
							Intensity: <strong>{carbTool.carbs.sessionIntensity}</strong>
						</p>
						{carbTool.carbs.shouldFuelDuringSession ? (
							<>
								<p>Range: {carbTool.carbs.carbsPerHourLow}-{carbTool.carbs.carbsPerHourHigh} g/hour</p>
								<p>
									Session total: {carbTool.carbs.totalCarbsLowGrams} g to {carbTool.carbs.totalCarbsHighGrams} g
								</p>
							</>
						) : carbTool.carbs.isFuelingOptional ? (
							<p>In-session carbs are optional for this session profile.</p>
						) : (
							<p>In-session carbs not needed for this session profile.</p>
						)}
						<p>{carbTool.carbs.gutTrainingAdvice}</p>
						<p>{carbTool.carbs.planSummary}</p>
					</>
				)}
			</section>

			<section className="panel">
				<h2>Conversions Tool</h2>
				<div className="grid">
					<label>
						Kilometers to miles
						<input
							type="number"
							min={0}
							value={converterKm}
							onChange={(event) => setConverterKm(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							placeholder="10"
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
							placeholder="6.21"
						/>
					</label>
					<label>
						Pace per km minutes
						<input
							type="number"
							min={0}
							value={pacePerKmMin}
							onChange={(event) => setPacePerKmMin(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							placeholder="5"
						/>
					</label>
					<label>
						Pace per km seconds
						<input
							type="number"
							min={0}
							max={59}
							value={pacePerKmSec}
							onChange={(event) => setPacePerKmSec(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							placeholder="00"
						/>
					</label>
					<label>
						Pace per mile minutes
						<input
							type="number"
							min={0}
							value={pacePerMileMin}
							onChange={(event) => setPacePerMileMin(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							placeholder="8"
						/>
					</label>
					<label>
						Pace per mile seconds
						<input
							type="number"
							min={0}
							max={59}
							value={pacePerMileSec}
							onChange={(event) => setPacePerMileSec(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							placeholder="03"
						/>
					</label>
				</div>

				<div className="cards">
					<article className="card">
						<h3>Distance</h3>
						<p>{converterTool.kmToMiles === null ? "-" : `${converterKm} km = ${converterTool.kmToMiles.toFixed(2)} mi`}</p>
						<small>{converterTool.milesToKm === null ? "-" : `${converterMiles} mi = ${converterTool.milesToKm.toFixed(2)} km`}</small>
					</article>
					<article className="card">
						<h3>Pace</h3>
						<p>{converterTool.secondsPerMileFromKm > 0 ? `${pacePerKmMin}:${String(Number(pacePerKmSec || "0")).padStart(2, "0")} /km = ${formatPace(converterTool.secondsPerMileFromKm)} /mi` : "-"}</p>
						<small>
							{converterTool.secondsPerKmFromMile > 0 ? `${pacePerMileMin}:${String(Number(pacePerMileSec || "0")).padStart(2, "0")} /mi = ${formatPace(converterTool.secondsPerKmFromMile)} /km` : "-"}
						</small>
					</article>
				</div>
			</section>
			<style jsx>{`
				.shell {
					max-width: 980px;
					margin: 0 auto;
					padding: 3rem 1.5rem 6rem;
					font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
					color: #09090b;
					background-color: #ffffff;
				}

				.hero {
					margin-bottom: 2.5rem;
					padding: 2rem;
					background: #ffffff;
					border: 1px solid #e4e4e7;
					border-radius: 1.5rem;
					box-shadow: 0 4px 30px rgba(0, 0, 0, 0.01);
				}

				.hero h1 {
					font-size: 2rem;
					font-weight: 900;
					tracking: -0.05em;
					text-transform: uppercase;
					margin: 0 0 0.5rem;
					color: #09090b;
				}

				.hero p {
					font-size: 0.85rem;
					color: #71717a;
					margin: 0;
					text-transform: uppercase;
					letter-spacing: 0.05em;
				}

				.panel {
					margin-top: 4rem; /* Espaciado elegante entre secciones */
					padding: 0; /* Sin relleno artificial interno */
					background: transparent; /* Eliminamos el fondo grisáceo */
					border: none; /* Sin recuadros de contención */
					box-shadow: none; /* Sin sombras pesadas de bloque */
				}

				.panel h2 {
					font-size: 0.75rem;
					font-weight: 700;
					text-transform: uppercase;
					letter-spacing: 0.15em;
					color: #71717a;
					margin: 0 0 2rem;
					display: flex;
					align-items: center;
					gap: 0.5rem;
				}

				.panel h2::before {
					content: "";
					display: inline-block;
					width: 6px;
					height: 6px;
					border-radius: 50%;
					background-color: #09090b;
				}

				.grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
					gap: 1.25rem;
					margin-bottom: 2rem;
				}

				label {
					display: flex;
					flex-direction: column;
					font-size: 0.65rem;
					text-transform: uppercase;
					letter-spacing: 0.05em;
					font-weight: 700;
					color: #a1a1aa;
					gap: 0.5rem;
				}

				input[type="text"],
				input[type="number"] {
					padding: 0.85rem 1rem;
					background: rgba(244, 244, 245, 0.6);
					border: 1px solid #e4e4e7;
					border-radius: 1rem;
					font-size: 0.95rem;
					font-family: inherit;
					color: #09090b;
					transition: all 0.2s ease;
					box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.03);
				}

				input:focus {
					outline: none;
					border-color: #09090b;
					background: #ffffff;
				}

				.sliderWrap {
					margin: 2rem 0;
					background: rgba(244, 244, 245, 0.5);
					padding: 1.5rem;
					border-radius: 1.25rem;
					border: 1px solid #e4e4e7;
				}

				input[type="range"] {
					-webkit-appearance: none;
					width: 100%;
					height: 4px;
					background: #e4e4e7;
					border-radius: 2px;
					outline: none;
				}

				input[type="range"]::-webkit-slider-thumb {
					-webkit-appearance: none;
					width: 16px;
					height: 16px;
					border-radius: 50%;
					background: #09090b;
					cursor: pointer;
					transition: transform 0.1s;
				}

				input[type="range"]::-webkit-slider-thumb:hover {
					transform: scale(1.2);
				}

				.ticks {
					display: grid;
					grid-template-columns: repeat(5, minmax(0, 1fr));
					margin-top: 0.75rem;
					font-size: 0.65rem;
					text-transform: uppercase;
				}

				.ticks span {
					text-align: center;
					color: #a1a1aa;
					transition: color 0.2s ease;
				}

				.ticks .active {
					color: #09090b;
					font-weight: 900;
				}

				.cards {
					display: grid;
					gap: 1rem;
					grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
					margin-top: 1.5rem;
				}
								/* --- CONTENEDORES FLOTANTES (SIN BORDES NI FONDOS GRISES) --- */
				.card {
					padding: 1.5rem 0; /* Eliminamos el cojín lateral */
					background: transparent; /* Todo flota en el blanco */
					border: none; /* Sin recuadros */
					box-shadow: none; /* Sin sombras externas */
					position: relative;
				}

				.card h3 {
					font-size: 0.65rem;
					margin: 0 0 0.5rem;
					text-transform: uppercase;
					color: #a1a1aa;
					letter-spacing: 0.05em;
				}

				/* El rango superior ahora es texto plano y limpio en el aire */
				.card p {
					font-size: 1.25rem;
					font-weight: 400;
					margin: 0;
					color: #71717a;
				}

				/* --- EL TEMPORIZADOR LED ROJO OFICIAL --- */
				/* Estiliza la predicción central exacta (00:00:00) como un display digital */
				.panel:nth-of-type(2) .card small {
					font-family: 'Courier New', Courier, monospace;
					font-size: 1.5rem;
					font-weight: 900;
					color: #ff3333;
					background: #000000;
					padding: 0.5rem 1rem;
					border-radius: 0.5rem;
					display: inline-block;
					letter-spacing: 0.08em;
					box-shadow: 
						inset 0 3px 8px rgba(0, 0, 0, 0.9),
						0 0 15px rgba(255, 51, 51, 0.15);
					border: 1px solid rgba(255, 51, 51, 0.2);
					margin-top: 0.75rem;
				}

				/* Para los textos normales de los otros módulos, mantenemos su tamaño limpio */
				.panel:not(nth-of-type(2)) .card small {
					font-size: 0.85rem;
					color: #71717a;
				}

				.paceTable {
					display: grid;
					gap: 0.5rem;
					margin-top: 1.5rem;
				}

				.paceRow {
					display: grid;
					grid-template-columns: 140px 1fr 1fr;
					gap: 1rem;
					padding: 0.85rem 1.25rem;
					background: rgba(255, 255, 255, 0.6);
					border: 1px solid #e4e4e7;
					border-radius: 1rem;
					font-size: 0.85rem;
					align-items: center;
				}

				.paceRow strong {
					font-size: 0.7rem;
					text-transform: uppercase;
					letter-spacing: 0.05em;
					color: #09090b;
				}

				.toolError {
					margin-top: 1.5rem;
					padding: 1rem;
					border-radius: 1rem;
					font-size: 0.75rem;
					color: #a94442;
					background: #fef2f2;
					border: 1px solid #fca5a5;
					text-transform: uppercase;
				}

				@media (max-width: 700px) {
					.paceRow {
						grid-template-columns: 1fr;
						gap: 0.25rem;
					}
				}
			`}</style>
		</main>
	);
}

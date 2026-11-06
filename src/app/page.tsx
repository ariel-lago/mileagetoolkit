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
				<h1>Mileage Toolkit</h1>
				<p>race prediction, training paces, fueling, and conversions</p>
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
				@import url('https://googleapis.com');

				/* --- ANIMACIONES ESTRUCTURALES --- */
				@keyframes fadeInUp {
					from {
						opacity: 0;
						transform: translateY(15px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				@keyframes pulseOrb {
					0%, 100% {
						transform: scale(1) translate(0px, 0px);
						opacity: 0.2;
					}
					50% {
						transform: scale(1.15) translate(10px, -15px);
						opacity: 0.35;
					}
				}

				@keyframes pulseOrbDelayed {
					0%, 100% {
						transform: scale(1.1) translate(0px, 0px);
						opacity: 0.15;
					}
					50% {
						transform: scale(0.9) translate(-15px, 15px);
						opacity: 0.3;
					}
				}

				.shell {
					max-width: 900px;
					margin: 0 auto;
					padding: 4rem 1.5rem 8rem;
					font-family: 'Space Grotesk', sans-serif;
					color: #000000;
					background-color: #ffffff;
					position: relative;
					overflow: hidden;
				}

				/* --- ELEMENTOS BLURRY (AURAS LÍQUIDAS DE FONDO) --- */
				.shell::before {
					content: "";
					position: absolute;
					top: 15%;
					right: -10%;
					width: 350px;
					height: 350px;
					border-radius: 50%;
					background: radial-gradient(circle, rgba(34,211,238,0.4) 0%, rgba(255,255,255,0) 70%);
					filter: blur(60px);
					z-index: 0;
					pointer-events: none;
					animation: pulseOrb 12s infinite ease-in-out;
				}

				.shell::after {
					content: "";
					position: absolute;
					bottom: 25%;
					left: -10%;
					width: 400px;
					height: 400px;
					border-radius: 50%;
					background: radial-gradient(circle, rgba(217,70,239,0.3) 0%, rgba(255,255,255,0) 70%);
					filter: blur(80px);
					z-index: 0;
					pointer-events: none;
					animation: pulseOrbDelayed 16s infinite ease-in-out;
				}

				/* --- AVANT-GARDE HERO HEADER --- */
				.hero {
					margin-bottom: 5rem;
					padding-bottom: 2rem;
					border-b: 2px solid #000000;
					position: relative;
					z-index: 10;
					animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
				}

				.hero h1 {
					font-family: 'Darker Grotesque', sans-serif;
					font-size: 4.5rem;
					font-weight: 900;
					line-height: 0.85;
					letter-spacing: -0.06em;
					text-transform: uppercase;
					margin: 0 0 1rem;
					color: #000000;
				}

				.hero p {
					font-family: 'Courier Prime', monospace;
					font-size: 0.8rem;
					color: #71717a;
					margin: 0;
					text-transform: lowercase;
				}

				/* --- SECCIONES FLOTANTES (EFECTO SUBIDA AL CARGAR) --- */
				.panel {
					margin-top: 5rem;
					padding: 0;
					background: transparent;
					border: none;
					box-shadow: none;
					position: relative;
					z-index: 10;
					animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
				}
				
				.panel:nth-of-type(2) { animation-delay: 0.1s; }
				.panel:nth-of-type(3) { animation-delay: 0.2s; }
				.panel:nth-of-type(4) { animation-delay: 0.3s; }

				.panel h2 {
					font-family: 'Courier Prime', monospace;
					font-size: 0.8rem;
					font-weight: 700;
					text-transform: uppercase;
					letter-spacing: 0.1em;
					color: #000000;
					margin: 0 0 2rem;
					border-bottom: 1px dashed #e4e4e7;
					padding-bottom: 0.5rem;
				}

				.grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
					gap: 1.5rem;
					margin-bottom: 2.5rem;
				}

				label {
					display: flex;
					flex-direction: column;
					font-family: 'Space Grotesk', sans-serif;
					font-size: 0.75rem;
					text-transform: uppercase;
					letter-spacing: 0.05em;
					font-weight: 700;
					color: #71717a;
					gap: 0.5rem;
				}

				/* Cajas de entrada reactivas con micro-interacciones */
				input[type="text"],
				input[type="number"] {
					padding: 0.75rem 0.5rem;
					background: rgba(255, 255, 255, 0.8);
					border: 2px solid #000000;
					border-radius: 0px;
					font-size: 1rem;
					font-family: 'Space Grotesk', sans-serif;
					font-weight: 700;
					color: #000000;
					transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
				}

				input:focus {
					outline: none;
					background: #ffffff;
					transform: translateY(-2px);
					box-shadow: 6px 6px 0px #000000; /* Sombra pop-art aumentada */
				}

				/* Control deslizante suave */
				.sliderWrap {
					margin: 2.5rem 0;
				}

				input[type="range"] {
					-webkit-appearance: none;
					width: 100%;
					height: 2px;
					background: #000000;
					outline: none;
				}

				input[type="range"]::-webkit-slider-thumb {
					-webkit-appearance: none;
					width: 14px;
					height: 14px;
					background: #000000;
					border: 2px solid #ffffff;
					cursor: pointer;
					transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
				}

				input[type="range"]::-webkit-slider-thumb:hover {
					transform: scale(1.4);
				}

				.ticks {
					display: grid;
					grid-template-columns: repeat(5, minmax(0, 1fr));
					margin-top: 0.75rem;
					font-family: 'Courier Prime', monospace;
					font-size: 0.7rem;
				}

				.ticks span {
					text-align: center;
					color: #a1a1aa;
					transition: color 0.2s ease;
				}

				.ticks .active {
					color: #000000;
					font-weight: 700;
					text-decoration: underline;
				}

				/* --- TARJETAS SALIDA FLOTANTES --- */
				.cards {
					display: grid;
					gap: 1.5rem;
					grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
					margin-top: 2rem;
				}

				.card {
					padding: 1rem 0;
					background: transparent;
					border: none;
					position: relative;
					transition: transform 0.3s ease;
				}

				/* Micro-reacción al pasar el ratón por encima de los datos flotantes */
				.card:hover {
					transform: translateX(4px);
				}

				.card h3 {
					font-family: 'Courier Prime', monospace;
					font-size: 0.7rem;
					margin: 0;
					text-transform: uppercase;
					color: #a1a1aa;
				}

				.card p {
					font-family: 'Space Grotesk', sans-serif;
					font-size: 1.75rem;
					font-weight: 700;
					margin: 0.25rem 0 0;
					color: #000000;
					letter-spacing: -0.04em;
				}

				.card small {
					font-family: 'Courier Prime', monospace;
					font-size: 0.85rem;
					color: #71717a;
					display: block;
					margin-top: 0.25rem;
				}

				/* --- EL RELOJ DE META LED ROJO --- */
				.panel:nth-of-type(2) .card small {
					font-family: 'Courier New', Courier, monospace;
					font-size: 1.6rem;
					font-weight: 900;
					color: #ff2222;
					background: #000000;
					padding: 0.5rem 1rem;
					border-radius: 4px;
					display: inline-block;
					letter-spacing: 0.06em;
					box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.9);
					border: 1px solid #331111;
					margin-top: 0.5rem;
					text-shadow: 0 0 10px rgba(255, 34, 34, 0.8);
					animation: pulse 2s infinite alternate; /* Efecto de parpadeo leve de marcador real */
				}

				/* Tablas de ritmos limpias */
				.paceTable {
					display: grid;
					gap: 0.25rem;
					margin-top: 1.5rem;
				}

				.paceRow {
					display: grid;
					grid-template-columns: 150px 1fr 1fr;
					gap: 1rem;
					padding: 0.75rem 0;
					border-bottom: 1px solid #f4f4f5;
					font-size: 0.9rem;
					transition: background 0.2s ease;
				}

				.paceRow:hover {
					background: rgba(244, 244, 245, 0.4);
					padding-left: 0.5rem;
				}

				.paceRow strong {
					font-family: 'Courier Prime', monospace;
					font-size: 0.75rem;
					text-transform: uppercase;
					color: #000000;
				}

				.toolError {
					margin-top: 1.5rem;
					padding: 0.75rem;
					font-family: 'Courier Prime', monospace;
					font-size: 0.75rem;
					color: #ffffff;
					background: #000000;
					text-transform: uppercase;
					box-shadow: 4px 4px 0px #ef4444;
				}

				@media (max-width: 700px) {
					.paceRow {
						grid-template-columns: 1fr;
						padding: 0.5rem 0;
					}
				}
			`}</style>
		</main>
	);
}

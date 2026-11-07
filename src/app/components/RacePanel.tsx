"use client";

import { useMemo, useState } from "react";
import { calculatePace, calculateTrainingPaces, formatDuration, projectAllRaceDistances } from "../utils/calculators";
import { fieldLook, formatPace, parseDistanceInput, readRaceClock } from "./fields";
import { LedTime } from "./LedTime";

const raceDistanceOptions = [
	{ label: "5K", value: "5k" },
	{ label: "10K", value: "10k" },
	{ label: "Half", value: "half" },
	{ label: "Marathon", value: "marathon" }
];

export function RacePanel(): React.JSX.Element {
	const [selectedRaceDistance, setSelectedRaceDistance] = useState("");
	const [finishTime, setFinishTime] = useState("");

	const raceTool = useMemo(() => {
		const longRace = selectedRaceDistance === "half" || selectedRaceDistance === "marathon";
		const clock = readRaceClock(finishTime, longRace);
		const digitsOnly = !finishTime.includes(":") && finishTime.replace(/\D/g, "").length < 5;
		if (clock.status === "empty" || digitsOnly) {
			return { ok: false as const };
		}
		if (clock.status === "invalid") {
			return { ok: false as const, error: clock.error };
		}

		const totalSeconds = clock.totalSeconds;
		if (!selectedRaceDistance || totalSeconds <= 0) {
			return { ok: false as const };
		}

		const knownDistanceKm = parseDistanceInput(selectedRaceDistance);
		if (!knownDistanceKm) {
			return { ok: false as const };
		}

		const predictions = projectAllRaceDistances(totalSeconds, knownDistanceKm);
		const paces = calculateTrainingPaces(totalSeconds, knownDistanceKm);

		return {
			ok: true as const,
			predictions,
			paces
		};
	}, [selectedRaceDistance, finishTime]);

	return (
		<section className="panel">
			<h2 className="toolTitle">Race prediction</h2>
			<div className="distanceButtons" role="group" aria-label="Known race distance">
				{raceDistanceOptions.map((option) => (
					<button
						key={option.value}
						type="button"
						className={selectedRaceDistance === option.value ? "active" : ""}
						onClick={() => setSelectedRaceDistance(option.value)}
					>
						{option.label}
					</button>
				))}
			</div>
			<div className="raceEntry">
				<label>
					Finish time
					<input
						type="text"
						inputMode="text"
						aria-label="Finish time"
						placeholder="hh:mm:ss"
						value={finishTime}
						onChange={(event) => setFinishTime(event.target.value.replace(/[^\d:]/g, "").slice(0, 8))}
						onFocus={(event) => event.currentTarget.select()}
						onBlur={(event) => {
							const longRace = selectedRaceDistance === "half" || selectedRaceDistance === "marathon";
							const clock = readRaceClock(event.currentTarget.value, longRace);
							if (clock.status === "ok") {
								setFinishTime(clock.display);
							}
						}}
						{...fieldLook(finishTime || "hh:mm:ss")}
						data-filled={finishTime.trim() ? "true" : undefined}
					/>
					<span className="clockHint">hh:mm:ss</span>
				</label>
			</div>

			{raceTool.ok === false && "error" in raceTool ? (
				<p className="toolError">{raceTool.error}</p>
			) : raceTool.ok ? (
				<div className="scoreboard">
					<div className="clocks">
						{(
							[
								["5K", raceTool.predictions.fiveK],
								["10K", raceTool.predictions.tenK],
								["Half", raceTool.predictions.halfMarathon],
								["Marathon", raceTool.predictions.marathon]
							] as const
						).map(([label, prediction]) => {
							const pace = calculatePace(prediction.midSeconds, prediction.targetDistanceKm);
							return (
							<article className="readout" key={label} aria-label={`${label} ${formatDuration(prediction.midSeconds)}`}>
								<p className="readoutLabel">{label}</p>
								<LedTime time={formatDuration(prediction.midSeconds)} size="sm" />
								<p className="readoutPace">
									{formatPace(pace.secondsPerKm)} /km · {formatPace(pace.secondsPerMile)} /mi
								</p>
								<p className="readoutRange">
									{formatDuration(prediction.lowSeconds)}–{formatDuration(prediction.highSeconds)}
								</p>
							</article>
							);
						})}
					</div>
					<h3 className="paceHeading">Training paces</h3>
					<div className="paceGrid">
						{raceTool.paces.zones.map((zone) => (
							<article className="readout" key={zone.name}>
								<p className="readoutLabel">{zone.name}</p>
								<p className="readoutPace">{zone.labelPerKm}</p>
								<p className="readoutPace">{zone.labelPerMile}</p>
							</article>
						))}
					</div>
				</div>
			) : null}
		</section>
	);
}

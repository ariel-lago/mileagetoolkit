"use client";

import { useMemo, useState } from "react";
import { calculateCarbFueling, type CarbSessionIntensity } from "../utils/calculators";
import { fieldLook, parseDurationField } from "./fields";

const intensitySteps: Array<{ label: string; value: CarbSessionIntensity }> = [
	{ label: "Easy", value: "easy" },
	{ label: "Steady", value: "steady" },
	{ label: "Tempo", value: "tempo" },
	{ label: "Hard", value: "hard" },
	{ label: "Race", value: "race" }
];

export function CarbPanel(): React.JSX.Element {
	const [duration, setDuration] = useState("");
	const [intensityIndex, setIntensityIndex] = useState(1);

	const intensity = intensitySteps[intensityIndex]?.value ?? "steady";

	const carbTool = useMemo(() => {
		if (!duration.trim()) {
			return { ok: false as const };
		}

		const parsedDuration = parseDurationField(duration);
		if (!parsedDuration) {
			return { ok: false as const, error: "Use minutes, like 66, or a time like 1:06." };
		}

		const effortDurationMinutes = parsedDuration.hours * 60 + parsedDuration.minutes;
		if (effortDurationMinutes <= 0) {
			return { ok: false as const, error: "Session duration must be greater than zero." };
		}

		const carbs = calculateCarbFueling(70, effortDurationMinutes, {
			sessionIntensity: intensity
		});

		return {
			ok: true as const,
			effortDurationMinutes,
			carbs
		};
	}, [duration, intensity]);

	return (
		<section className="panel">
			<h2 className="toolTitle">Carb calculator</h2>
			<div className="grid">
				<label>
					Duration
					<input
						type="text"
						inputMode="text"
						value={duration}
						onChange={(event) => setDuration(event.target.value.replace(/[^\d:]/g, "").slice(0, 5))}
						onFocus={(event) => event.currentTarget.select()}
						{...fieldLook(duration)}
					/>
					<span className="clockHint">66 or 1:06</span>
				</label>
			</div>

			<div className="sliderWrap">
				<label htmlFor="effort">Session effort</label>
				<input
					id="effort"
					type="range"
					min={0}
					max={intensitySteps.length - 1}
					step={1}
					value={intensityIndex}
					onChange={(event) => setIntensityIndex(Number(event.target.value))}
				/>
				<div className="ticks" role="group" aria-label="Session effort">
					{intensitySteps.map((item, index) => (
						<button
							key={item.value}
							type="button"
							className={index === intensityIndex ? "active" : ""}
							style={{ left: `calc(${index} * (100% - 14px) / ${intensitySteps.length - 1} + 7px)` }}
							onClick={() => setIntensityIndex(index)}
						>
							{item.label}
						</button>
					))}
				</div>
			</div>

			{carbTool.ok === false && "error" in carbTool ? (
				<p className="toolError">{carbTool.error}</p>
			) : carbTool.ok ? (
				<div className="fuelResult">
					<p className="fuelKicker">{carbTool.effortDurationMinutes} min · {carbTool.carbs.sessionIntensity}</p>
					{carbTool.carbs.shouldFuelDuringSession ? (
						<p className="fuelFigure">
							{carbTool.carbs.carbsPerHourLow}–{carbTool.carbs.carbsPerHourHigh}
							<span> g/hour</span>
						</p>
					) : (
						<p className="fuelFigure">
							{carbTool.carbs.isFuelingOptional ? "Optional" : "Not needed"}
						</p>
					)}
					{carbTool.carbs.shouldFuelDuringSession ? (
						<p className="fuelTotal">
							{carbTool.carbs.totalCarbsLowGrams}–{carbTool.carbs.totalCarbsHighGrams} g for the session
						</p>
					) : null}
					<p className="fuelNote">{carbTool.carbs.gutTrainingAdvice}</p>
					<p className="fuelNote">{carbTool.carbs.planSummary}</p>
				</div>
			) : null}
		</section>
	);
}

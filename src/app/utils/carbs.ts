import { assertPositive } from "./units";

export interface CarbFuelingRecommendation {
	athleteWeightKg: number;
	effortDurationMinutes: number;
	sessionIntensity: CarbSessionIntensity;
	shouldFuelDuringSession: boolean;
	isFuelingOptional: boolean;
	carbsPerHourLow: number;
	carbsPerHourHigh: number;
	totalCarbsLowGrams: number;
	totalCarbsHighGrams: number;
	gutTrainingAdvice: string;
	highCarbMessage: string;
	planSummary: string;
}

export type CarbSessionIntensity = "easy" | "steady" | "tempo" | "hard" | "race";

export interface CarbFuelingOptions {
	sessionIntensity?: CarbSessionIntensity;
}

/**
 * High-carb fueling recommendation with progressive gut training guidance.
 * For efforts over 1h30, this enforces at least 60 g carbs/hour as baseline guidance.
 */
export function calculateCarbFueling(
	athleteWeightKg: number,
	effortDurationMinutes: number,
	options: CarbFuelingOptions = {}
): CarbFuelingRecommendation {
	assertPositive(athleteWeightKg, "Athlete weight (kg)");
	assertPositive(effortDurationMinutes, "Effort duration (minutes)");

	const sessionIntensity = options.sessionIntensity ?? "steady";

	const hours = effortDurationMinutes / 60;
	let shouldFuelDuringSession = true;
	let isFuelingOptional = false;
	let carbsPerHourLow = 30;
	let carbsPerHourHigh = 45;

	if (effortDurationMinutes < 30) {
		shouldFuelDuringSession = false;
		isFuelingOptional = false;
		carbsPerHourLow = 0;
		carbsPerHourHigh = 0;
	} else if (effortDurationMinutes < 60) {
		shouldFuelDuringSession = false;
		isFuelingOptional = true;
		carbsPerHourLow = 0;
		carbsPerHourHigh = 30;
	} else if (effortDurationMinutes <= 75 && sessionIntensity === "easy") {
		shouldFuelDuringSession = false;
		isFuelingOptional = true;
		carbsPerHourLow = 0;
		carbsPerHourHigh = 30;
	} else if (effortDurationMinutes < 75 && sessionIntensity === "steady") {
		shouldFuelDuringSession = false;
		isFuelingOptional = true;
		carbsPerHourLow = 0;
		carbsPerHourHigh = 30;
	}

	if (shouldFuelDuringSession) {
		const durationBand = effortDurationMinutes <= 90
			? "short"
			: effortDurationMinutes < 150
				? "medium"
				: effortDurationMinutes < 210
					? "long"
					: "veryLong";

		switch (durationBand) {
			case "short":
				switch (sessionIntensity) {
					case "easy":
						carbsPerHourLow = 20;
						carbsPerHourHigh = 35;
						break;
					case "steady":
						carbsPerHourLow = 25;
						carbsPerHourHigh = 45;
						break;
					case "tempo":
						carbsPerHourLow = 30;
						carbsPerHourHigh = 55;
						break;
					case "hard":
						carbsPerHourLow = 40;
						carbsPerHourHigh = 70;
						break;
					case "race":
						carbsPerHourLow = 50;
						carbsPerHourHigh = 75;
						break;
				}
				break;
			case "medium":
				switch (sessionIntensity) {
					case "easy":
						carbsPerHourLow = 45;
						carbsPerHourHigh = 65;
						break;
					case "steady":
						carbsPerHourLow = 50;
						carbsPerHourHigh = 75;
						break;
					case "tempo":
						carbsPerHourLow = 65;
						carbsPerHourHigh = 90;
						break;
					case "hard":
						carbsPerHourLow = 75;
						carbsPerHourHigh = 105;
						break;
					case "race":
						carbsPerHourLow = 85;
						carbsPerHourHigh = 115;
						break;
				}
				break;
			case "long":
				switch (sessionIntensity) {
					case "easy":
						carbsPerHourLow = 55;
						carbsPerHourHigh = 75;
						break;
					case "steady":
						carbsPerHourLow = 60;
						carbsPerHourHigh = 85;
						break;
					case "tempo":
						carbsPerHourLow = 75;
						carbsPerHourHigh = 100;
						break;
					case "hard":
						carbsPerHourLow = 85;
						carbsPerHourHigh = 115;
						break;
					case "race":
						carbsPerHourLow = 95;
						carbsPerHourHigh = 120;
						break;
				}
				break;
			case "veryLong":
				switch (sessionIntensity) {
					case "easy":
						carbsPerHourLow = 60;
						carbsPerHourHigh = 80;
						break;
					case "steady":
						carbsPerHourLow = 70;
						carbsPerHourHigh = 95;
						break;
					case "tempo":
						carbsPerHourLow = 85;
						carbsPerHourHigh = 110;
						break;
					case "hard":
						carbsPerHourLow = 95;
						carbsPerHourHigh = 120;
						break;
					case "race":
						carbsPerHourLow = 100;
						carbsPerHourHigh = 120;
						break;
				}
				break;
		}
	}

	// Larger athletes often tolerate and benefit from slightly higher absolute intake.
	if (shouldFuelDuringSession && athleteWeightKg >= 80) {
		carbsPerHourLow += 5;
		carbsPerHourHigh += 5;
	}

	if (shouldFuelDuringSession && athleteWeightKg <= 55) {
		carbsPerHourLow = Math.max(15, carbsPerHourLow - 5);
		carbsPerHourHigh = Math.max(25, carbsPerHourHigh - 5);
	}

	if (shouldFuelDuringSession && effortDurationMinutes > 90 && carbsPerHourLow < 60) {
		carbsPerHourLow = 60;
	}

	carbsPerHourHigh = Math.min(120, carbsPerHourHigh);

	const totalCarbsLowGrams = Math.round(carbsPerHourLow * hours);
	const totalCarbsHighGrams = Math.round(carbsPerHourHigh * hours);

	const highCarbMessage =
		"This calculator follows a high-carb fueling approach to support sustained performance.";

	const gutTrainingAdvice = shouldFuelDuringSession
		? effortDurationMinutes > 90
			? "For efforts over 1h30, aim for at least 60 g carbs/hour. Start around the lower recommendation and increase gradually."
			: "Practice fueling in training so your gut adapts. Start near the lower recommendation and increase slowly when tolerated."
		: isFuelingOptional
			? effortDurationMinutes < 60
				? "For any effort under 60 minutes, in-session carbs are optional. Use them if helpful for quality or if pre-run fueling was light."
				: "For easy or steady sessions under 75 minutes, in-session carbs are optional. Use them if helpful for quality or if pre-run fueling was light."
			: "For efforts under 30 minutes, in-session carbs are usually unnecessary. Focus on normal meals and hydration.";

	const planSummary = shouldFuelDuringSession
		? `Aim around ${carbsPerHourLow}-${carbsPerHourHigh} g/hour and progress toward the upper end if tolerated.`
		: isFuelingOptional
			? "No strict carb target required. Optionally take small amounts if it improves how the session feels."
			: "No in-session carb target needed for a session this short.";

	return {
		athleteWeightKg,
		effortDurationMinutes,
		sessionIntensity,
		shouldFuelDuringSession,
		isFuelingOptional,
		carbsPerHourLow,
		carbsPerHourHigh,
		totalCarbsLowGrams,
		totalCarbsHighGrams,
		gutTrainingAdvice,
		highCarbMessage,
		planSummary
	};
}

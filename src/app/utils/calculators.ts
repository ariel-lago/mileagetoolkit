const KM_PER_MILE = 1.609344;

export const STANDARD_RACE_DISTANCES_KM = {
	fiveK: 5,
	tenK: 10,
	halfMarathon: 21.0975,
	marathon: 42.195
} as const;

function assertPositive(value: number, label: string): void {
	if (!Number.isFinite(value) || value <= 0) {
		throw new Error(`${label} must be a positive number.`);
	}
}

function assertNonNegative(value: number, label: string): void {
	if (!Number.isFinite(value) || value < 0) {
		throw new Error(`${label} must be a non-negative number.`);
	}
}

// Converts miles to kilometers
export function milesToKm(miles: number): number {
	assertNonNegative(miles, "Miles");
	return miles * KM_PER_MILE;
}

// Converts kilometers to miles
export function kmToMiles(km: number): number {
	assertNonNegative(km, "Kilometers");
	return km / KM_PER_MILE;
}

// Calculates pace in seconds per kilometer and seconds per mile
export function calculatePace(totalSeconds: number, distanceKm: number): {
	secondsPerKm: number;
	secondsPerMile: number;
} {
	assertPositive(totalSeconds, "Total seconds");
	assertPositive(distanceKm, "Distance (km)");

	const secondsPerKm = totalSeconds / distanceKm;
	const distanceMiles = kmToMiles(distanceKm);
	const secondsPerMile = totalSeconds / distanceMiles;

	return { secondsPerKm, secondsPerMile };
}

// Calculates total finish time in seconds from pace (seconds/km) and distance (km)
export function calculateFinishTime(distanceKm: number, paceSecondsPerKm: number): number {
	assertPositive(distanceKm, "Distance (km)");
	assertPositive(paceSecondsPerKm, "Pace (seconds per km)");

	return distanceKm * paceSecondsPerKm;
}

// Calculates speed in km/h and mph
export function calculateSpeed(totalSeconds: number, distanceKm: number): {
	kmPerHour: number;
	milesPerHour: number;
} {
	assertPositive(totalSeconds, "Total seconds");
	assertPositive(distanceKm, "Distance (km)");

	const hours = totalSeconds / 3600;
	const kmPerHour = distanceKm / hours;
	const milesPerHour = kmToMiles(distanceKm) / hours;

	return { kmPerHour, milesPerHour };
}

// Riegel race time projection
export function projectRaceTime(
	knownTimeSeconds: number,
	knownDistanceKm: number,
	targetDistanceKm: number,
	exponent = 1.06
): number {
	assertPositive(knownTimeSeconds, "Known time (seconds)");
	assertPositive(knownDistanceKm, "Known distance (km)");
	assertPositive(targetDistanceKm, "Target distance (km)");
	assertPositive(exponent, "Exponent");

	return knownTimeSeconds * Math.pow(targetDistanceKm / knownDistanceKm, exponent);
}

export type RacePredictionFormulaName =
	| "Riegel"
	| "RiegelConservative"
	| "RiegelAggressive"
	| "DanielsEquivalentPace";

export interface RacePredictionFormulaResult {
	formula: RacePredictionFormulaName;
	predictedSeconds: number;
}

export interface RacePredictionRange {
	knownDistanceKm: number;
	knownTimeSeconds: number;
	targetDistanceKm: number;
	formulas: RacePredictionFormulaResult[];
	lowSeconds: number;
	highSeconds: number;
	midSeconds: number;
	displayTimeRange: string;
}

export interface RacePredictionSet {
	fiveK: RacePredictionRange;
	tenK: RacePredictionRange;
	halfMarathon: RacePredictionRange;
	marathon: RacePredictionRange;
}

export interface RaceProjectionOptions {
	weeklyVolumeKm?: number;
}

/**
 * Builds a range prediction using multiple formulas.
 * Useful for website UI where runners want a likely range instead of a single number.
 */
export function projectRaceTimeRange(
	knownTimeSeconds: number,
	knownDistanceKm: number,
	targetDistanceKm: number,
	options: RaceProjectionOptions = {}
): RacePredictionRange {
	assertPositive(knownTimeSeconds, "Known time (seconds)");
	assertPositive(knownDistanceKm, "Known distance (km)");
	assertPositive(targetDistanceKm, "Target distance (km)");

	const riegel = projectRaceTime(knownTimeSeconds, knownDistanceKm, targetDistanceKm, 1.06);
	const riegelConservative = projectRaceTime(knownTimeSeconds, knownDistanceKm, targetDistanceKm, 1.08);
	const riegelAggressive = projectRaceTime(knownTimeSeconds, knownDistanceKm, targetDistanceKm, 1.04);

	// Equivalent-pace projection with a small fatigue factor that grows with distance step-up.
	const distanceRatio = targetDistanceKm / knownDistanceKm;
	const fatigueFactor = 1 + Math.max(0, distanceRatio - 1) * 0.03;
	const danielsEquivalentPace = knownTimeSeconds * distanceRatio * fatigueFactor;
	const volumeAdjustment = getEnduranceAdjustment(knownDistanceKm, targetDistanceKm, options.weeklyVolumeKm);

	const formulas: RacePredictionFormulaResult[] = [
		{ formula: "Riegel", predictedSeconds: riegel * volumeAdjustment },
		{ formula: "RiegelConservative", predictedSeconds: riegelConservative * volumeAdjustment },
		{ formula: "RiegelAggressive", predictedSeconds: riegelAggressive * volumeAdjustment },
		{ formula: "DanielsEquivalentPace", predictedSeconds: danielsEquivalentPace * volumeAdjustment }
	];

	const predictedValues = formulas.map((item) => item.predictedSeconds);
	const lowSeconds = Math.min(...predictedValues);
	const highSeconds = Math.max(...predictedValues);
	const midSeconds = predictedValues.reduce((sum, value) => sum + value, 0) / predictedValues.length;

	return {
		knownDistanceKm,
		knownTimeSeconds,
		targetDistanceKm,
		formulas,
		lowSeconds,
		highSeconds,
		midSeconds,
		displayTimeRange: formatDurationRange(lowSeconds, highSeconds)
	};
}

function getEnduranceAdjustment(
	knownDistanceKm: number,
	targetDistanceKm: number,
	weeklyVolumeKm?: number
): number {
	if (!weeklyVolumeKm || targetDistanceKm < STANDARD_RACE_DISTANCES_KM.halfMarathon) {
		return 1;
	}

	assertPositive(weeklyVolumeKm, "Weekly volume (km)");

	let factor = 1;

	if (targetDistanceKm >= STANDARD_RACE_DISTANCES_KM.halfMarathon) {
		if (weeklyVolumeKm < 35) {
			factor += 0.04;
		} else if (weeklyVolumeKm < 50) {
			factor += 0.02;
		} else if (weeklyVolumeKm >= 80) {
			factor -= 0.015;
		}
	}

	if (targetDistanceKm >= STANDARD_RACE_DISTANCES_KM.marathon) {
		if (weeklyVolumeKm < 35) {
			factor += 0.06;
		} else if (weeklyVolumeKm < 50) {
			factor += 0.03;
		} else if (weeklyVolumeKm >= 90) {
			factor -= 0.02;
		}

		if (knownDistanceKm <= STANDARD_RACE_DISTANCES_KM.tenK && weeklyVolumeKm < 50) {
			factor += 0.03;
		}
	}

	return Math.max(0.9, Math.min(1.2, factor));
}

export function projectAllRaceDistances(
	knownTimeSeconds: number,
	knownDistanceKm: number,
	options: RaceProjectionOptions = {}
): RacePredictionSet {
	return {
		fiveK: projectRaceTimeRange(
			knownTimeSeconds,
			knownDistanceKm,
			STANDARD_RACE_DISTANCES_KM.fiveK,
			options
		),
		tenK: projectRaceTimeRange(
			knownTimeSeconds,
			knownDistanceKm,
			STANDARD_RACE_DISTANCES_KM.tenK,
			options
		),
		halfMarathon: projectRaceTimeRange(
			knownTimeSeconds,
			knownDistanceKm,
			STANDARD_RACE_DISTANCES_KM.halfMarathon,
			options
		),
		marathon: projectRaceTimeRange(
			knownTimeSeconds,
			knownDistanceKm,
			STANDARD_RACE_DISTANCES_KM.marathon,
			options
		)
	};
}

export interface TrainingPaceZone {
	name: "easy" | "steady" | "marathon" | "tempo" | "threshold" | "interval" | "repetition";
	secondsPerKmLow: number;
	secondsPerKmHigh: number;
	labelPerKm: string;
	labelPerMile: string;
}

export interface TrainingPaceSet {
	basePaceSecondsPerKm: number;
	zones: TrainingPaceZone[];
}

function formatPaceRangePerKm(lowSecondsPerKm: number, highSecondsPerKm: number): string {
	return `${formatPaceValue(lowSecondsPerKm)}-${formatPaceValue(highSecondsPerKm)} /km`;
}

function formatPaceRangePerMile(lowSecondsPerKm: number, highSecondsPerKm: number): string {
	const lowSecondsPerMile = paceKmToMile(lowSecondsPerKm);
	const highSecondsPerMile = paceKmToMile(highSecondsPerKm);
	return `${formatPaceValue(lowSecondsPerMile)}-${formatPaceValue(highSecondsPerMile)} /mi`;
}

function formatPaceValue(totalSeconds: number): string {
	const rounded = Math.round(totalSeconds);
	const minutes = Math.floor(rounded / 60);
	const seconds = rounded % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function calculateTrainingPaces(
	knownTimeSeconds: number,
	knownDistanceKm: number
): TrainingPaceSet {
	assertPositive(knownTimeSeconds, "Known time (seconds)");
	assertPositive(knownDistanceKm, "Known distance (km)");

	const basePaceSecondsPerKm = knownTimeSeconds / knownDistanceKm;

	const zoneInputs: Array<
		Pick<TrainingPaceZone, "name"> & { low: number; high: number }
	> = [
		{ name: "easy", low: basePaceSecondsPerKm + 60, high: basePaceSecondsPerKm + 105 },
		{ name: "steady", low: basePaceSecondsPerKm + 35, high: basePaceSecondsPerKm + 60 },
		{ name: "marathon", low: basePaceSecondsPerKm + 20, high: basePaceSecondsPerKm + 35 },
		{ name: "tempo", low: basePaceSecondsPerKm + 10, high: basePaceSecondsPerKm + 22 },
		{ name: "threshold", low: basePaceSecondsPerKm + 5, high: basePaceSecondsPerKm + 15 },
		{ name: "interval", low: Math.max(130, basePaceSecondsPerKm - 18), high: Math.max(140, basePaceSecondsPerKm - 8) },
		{ name: "repetition", low: Math.max(120, basePaceSecondsPerKm - 30), high: Math.max(130, basePaceSecondsPerKm - 18) }
	];

	const zones: TrainingPaceZone[] = zoneInputs.map((zone) => ({
		name: zone.name,
		secondsPerKmLow: zone.low,
		secondsPerKmHigh: zone.high,
		labelPerKm: formatPaceRangePerKm(zone.low, zone.high),
		labelPerMile: formatPaceRangePerMile(zone.low, zone.high)
	}));

	return {
		basePaceSecondsPerKm,
		zones
	};
}

/**
 * Formats a race range as whole minutes, e.g. "20-21 min".
 */
export function formatMinuteRange(lowSeconds: number, highSeconds: number): string {
	assertPositive(lowSeconds, "Low seconds");
	assertPositive(highSeconds, "High seconds");

	const lowMinutes = Math.floor(lowSeconds / 60);
	const highMinutes = Math.ceil(highSeconds / 60);

	return `${lowMinutes}-${highMinutes} min`;
}

export function formatDurationCompact(totalSeconds: number): string {
	assertNonNegative(totalSeconds, "Total seconds");

	const rounded = Math.round(totalSeconds);
	if (rounded >= 3600) {
		const hours = Math.floor(rounded / 3600);
		const minutes = Math.floor((rounded % 3600) / 60);
		return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
	}

	const minutes = Math.floor(rounded / 60);
	const seconds = rounded % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDurationRange(lowSeconds: number, highSeconds: number): string {
	assertPositive(lowSeconds, "Low seconds");
	assertPositive(highSeconds, "High seconds");
	return `${formatDurationCompact(lowSeconds)}-${formatDurationCompact(highSeconds)}`;
}

// Converts seconds to HH:MM:SS format
export function formatDuration(totalSeconds: number): string {
	assertNonNegative(totalSeconds, "Total seconds");

	const rounded = Math.round(totalSeconds);
	const hours = Math.floor(rounded / 3600);
	const minutes = Math.floor((rounded % 3600) / 60);
	const seconds = rounded % 60;

	return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

// Parses HH:MM:SS or MM:SS into total seconds
export function parseDuration(duration: string): number {
	const parts = duration.split(":").map((part) => Number(part.trim()));

	if (parts.some((part) => !Number.isFinite(part) || part < 0)) {
		throw new Error("Duration must be in HH:MM:SS or MM:SS format.");
	}

	if (parts.length === 2) {
		const [minutes, seconds] = parts;
		if (seconds >= 60) {
			throw new Error("Seconds must be less than 60.");
		}
		return minutes * 60 + seconds;
	}

	if (parts.length === 3) {
		const [hours, minutes, seconds] = parts;
		if (minutes >= 60 || seconds >= 60) {
			throw new Error("Minutes and seconds must be less than 60.");
		}
		return hours * 3600 + minutes * 60 + seconds;
	}

	throw new Error("Duration must be in HH:MM:SS or MM:SS format.");
}

//Converts pace from min/mile to min/km (input and output in seconds/unit)
export function paceMileToKm(secondsPerMile: number): number {
	assertPositive(secondsPerMile, "Pace (seconds per mile)");
	return secondsPerMile / KM_PER_MILE;
}

//Converts pace from min/km to min/mile (input and output in seconds/unit)
export function paceKmToMile(secondsPerKm: number): number {
	assertPositive(secondsPerKm, "Pace (seconds per km)");
	return secondsPerKm * KM_PER_MILE;
}

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

	if (effortDurationMinutes <= 75 && sessionIntensity === "easy") {
		shouldFuelDuringSession = false;
		carbsPerHourLow = 0;
		carbsPerHourHigh = 0;
	}

	if (effortDurationMinutes < 75 && sessionIntensity === "steady") {
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
						carbsPerHourLow = 40;
						carbsPerHourHigh = 65;
						break;
					case "hard":
						carbsPerHourLow = 50;
						carbsPerHourHigh = 80;
						break;
					case "race":
						carbsPerHourLow = 60;
						carbsPerHourHigh = 90;
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
			? "For short steady sessions under 75 minutes, in-session carbs are optional. Use them if helpful for quality or if pre-run fueling was light."
			: "For a short easy run, in-session carbs are usually unnecessary. Focus on normal meals and hydration.";

	const planSummary = shouldFuelDuringSession
		? `Aim around ${carbsPerHourLow}-${carbsPerHourHigh} g/hour and progress toward the upper end if tolerated.`
		: isFuelingOptional
			? "No strict carb target required. Optionally take small amounts if it improves how the session feels."
			: "No in-session carb target needed for this workout; save carbs for harder or longer sessions.";

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

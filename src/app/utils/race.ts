import {
	assertPositive,
	formatDurationRange
} from "./units";

export const STANDARD_RACE_DISTANCES_KM = {
	fiveK: 5,
	tenK: 10,
	halfMarathon: 21.0975,
	marathon: 42.195
} as const;

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

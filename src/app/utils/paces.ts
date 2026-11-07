import { projectAllRaceDistances, type RacePredictionRange } from "./race";
import { assertPositive, paceKmToMile } from "./units";

export interface TrainingPaceZone {
	name: "easy" | "steady" | "marathon" | "tempo" | "threshold" | "interval";
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
	const predictions = projectAllRaceDistances(knownTimeSeconds, knownDistanceKm);

	const zoneFromPrediction = (
		name: TrainingPaceZone["name"],
		prediction: RacePredictionRange,
		minSpanSeconds: number
	): { name: TrainingPaceZone["name"]; low: number; high: number } => {
		const fast = prediction.midSeconds / prediction.targetDistanceKm;
		const slowEnd = prediction.highSeconds / prediction.targetDistanceKm;
		const slow = Math.max(slowEnd, fast + minSpanSeconds);
		return { name, low: fast, high: slow };
	};

	const marathonMid = predictions.marathon.midSeconds / predictions.marathon.targetDistanceKm;
	const marathonHalfSpan = 15;
	const marathon = {
		name: "marathon" as const,
		low: marathonMid - marathonHalfSpan,
		high: marathonMid + marathonHalfSpan
	};
	const tempo = zoneFromPrediction("tempo", predictions.halfMarathon, 10);
	const threshold = zoneFromPrediction("threshold", predictions.tenK, 8);
	const fiveKPace = predictions.fiveK.midSeconds / predictions.fiveK.targetDistanceKm;
	const interval = {
		name: "interval" as const,
		low: fiveKPace - 20,
		high: fiveKPace
	};

	const keepFasterThan = (
		faster: { low: number; high: number },
		slowerPace: number
	): void => {
		const maxSlow = slowerPace - 2;
		if (faster.high > maxSlow) {
			faster.high = Math.max(faster.low, maxSlow);
		}
	};

	keepFasterThan(tempo, marathonMid);
	keepFasterThan(threshold, tempo.low);
	keepFasterThan(interval, threshold.low);

	const easyLow = basePaceSecondsPerKm + 80;
	const easyHigh = basePaceSecondsPerKm + 150;
	const steadyLow = basePaceSecondsPerKm + 35;
	const steadyHigh = easyLow;

	const zoneInputs: Array<
		Pick<TrainingPaceZone, "name"> & { low: number; high: number }
	> = [
		{ name: "easy", low: easyLow, high: easyHigh },
		{ name: "steady", low: steadyLow, high: steadyHigh },
		marathon,
		tempo,
		threshold,
		interval
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

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

	const zoneInputs: Array<
		Pick<TrainingPaceZone, "name"> & { low: number; high: number }
	> = [
		{ name: "easy", low: basePaceSecondsPerKm + 60, high: basePaceSecondsPerKm + 105 },
		{ name: "steady", low: basePaceSecondsPerKm + 35, high: basePaceSecondsPerKm + 60 },
		{ name: "marathon", low: basePaceSecondsPerKm + 20, high: basePaceSecondsPerKm + 35 },
		{ name: "tempo", low: basePaceSecondsPerKm + 10, high: basePaceSecondsPerKm + 22 },
		{ name: "threshold", low: basePaceSecondsPerKm + 5, high: basePaceSecondsPerKm + 15 },
		{ name: "interval", low: basePaceSecondsPerKm - 30, high: basePaceSecondsPerKm - 8 }
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

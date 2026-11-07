const KM_PER_MILE = 1.609344;

export function assertPositive(value: number, label: string): void {
	if (!Number.isFinite(value) || value <= 0) {
		throw new Error(`${label} must be a positive number.`);
	}
}

export function assertNonNegative(value: number, label: string): void {
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

export type KitFeedback = "cold" | "right" | "hot";
export type KitSession = "easy" | "steady" | "tempo" | "race";

const SESSION_WARMTH: Record<KitSession, number> = {
	easy: -2,
	steady: 0,
	tempo: 3,
	race: 5
};

export interface KitConditions {
	temperatureC: number;
	feelsLikeC: number;
	windKmh: number;
	raining: boolean;
}

export interface KitOutfit {
	top: string;
	legs: string;
	extras: string[];
}

const OFFSET_STEP = 2;
const OFFSET_LIMIT = 12;

export function kitTemperature(feelsLikeC: number, offsetC: number): number {
	return feelsLikeC + offsetC;
}

export function applyKitFeedback(offsetC: number, feedback: KitFeedback): number {
	if (feedback === "cold") {
		return Math.max(-OFFSET_LIMIT, offsetC - OFFSET_STEP);
	}
	if (feedback === "hot") {
		return Math.min(OFFSET_LIMIT, offsetC + OFFSET_STEP);
	}
	if (offsetC > 0) {
		return offsetC - 1;
	}
	if (offsetC < 0) {
		return offsetC + 1;
	}
	return 0;
}

export function recommendKit(conditions: KitConditions, offsetC: number, session: KitSession = "steady"): KitOutfit {
	const personalC = kitTemperature(conditions.feelsLikeC, offsetC);
	const kitC = personalC + SESSION_WARMTH[session];
	const windy = conditions.windKmh >= 25;
	const extras: string[] = [];

	let top = "Long sleeve tee";
	if (kitC >= 18) {
		top = "Singlet";
	} else if (kitC >= 11) {
		top = "Short sleeve tee";
	} else if (kitC >= 1) {
		top = "Long sleeve tee";
	} else if (kitC >= -6) {
		top = "Long sleeve tee and a light shell";
	} else {
		top = "Long sleeve tee and a warm layer";
	}

	if (windy && kitC < 8 && top === "Long sleeve tee") {
		top = "Long sleeve tee and a light shell";
	}
	if (conditions.raining && kitC < 11 && top === "Short sleeve tee") {
		top = "Short sleeve tee and a light shell";
	}
	if (conditions.raining && kitC < 11 && top === "Long sleeve tee") {
		top = "Long sleeve tee and a light shell";
	}

	const legs = personalC < -2 ? "Tights" : "Shorts";

	if (kitC <= 6 || (windy && kitC < 10)) {
		extras.push("Buff over ears and face");
	}
	if (session === "race" && personalC < 2 && !top.includes("shell") && !top.includes("warm")) {
		extras.push("Shell to start, then tie it on");
	}
	if (conditions.raining) {
		extras.push("Cap");
	}

	return { top, legs, extras };
}

export function weatherLabel(code: number): string {
	if (code === 0) {
		return "Clear";
	}
	if (code <= 3) {
		return "Cloudy";
	}
	if (code === 45 || code === 48) {
		return "Fog";
	}
	if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) {
		return "Rain";
	}
	if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
		return "Snow";
	}
	return "Outside";
}

export function isRaining(code: number, precipitationMm: number): boolean {
	const rainyCode = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
	return rainyCode || precipitationMm >= 0.2;
}

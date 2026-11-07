export function parseDistanceInput(value: string): number | null {
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

export function formatPace(secondsPerUnit: number): string {
	const rounded = Math.round(secondsPerUnit);
	const minutes = Math.floor(rounded / 60);
	const seconds = rounded % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function parsePositive(value: string): number | null {
	if (!value.trim()) {
		return null;
	}
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}
	return parsed;
}

export function parseNonNegative(value: string): number | null {
	if (!value.trim()) {
		return null;
	}
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return null;
	}
	return parsed;
}

export function parseClockParts(
	hours: string,
	minutes: string,
	seconds: string
): { status: "empty" } | { status: "invalid"; error: string } | { status: "ok"; totalSeconds: number } {
	if (!hours.trim() && !minutes.trim() && !seconds.trim()) {
		return { status: "empty" };
	}

	const hourNum = hours.trim() ? parseNonNegative(hours) : 0;
	const minuteNum = minutes.trim() ? parseNonNegative(minutes) : 0;
	const secondNum = seconds.trim() ? parseNonNegative(seconds) : 0;
	if (hourNum === null || minuteNum === null || secondNum === null) {
		return { status: "invalid", error: "Time must be valid numbers." };
	}

	if (minuteNum >= 60 || secondNum >= 60) {
		return { status: "invalid", error: "Minutes and seconds must be between 0 and 59." };
	}

	const totalSeconds = hourNum * 3600 + minuteNum * 60 + secondNum;
	if (totalSeconds <= 0) {
		return { status: "invalid", error: "Time must be greater than zero." };
	}

	return { status: "ok", totalSeconds };
}

export function clockDigits(value: string): string {
	return value.replace(/\D/g, "").slice(0, 6);
}

export function clockDisplay(digits: string): string {
	const padded = clockDigits(digits).padStart(6, "0");
	return `${padded.slice(0, 2)}:${padded.slice(2, 4)}:${padded.slice(4, 6)}`;
}

function clockParts(raw: string): [number, number, number] | null {
	const cleaned = raw.trim().replace(/[^\d:]/g, "");
	if (!cleaned) {
		return null;
	}

	if (!cleaned.includes(":")) {
		const digits = cleaned.slice(0, 6);
		if (digits.length <= 2) {
			return [0, Number(digits), 0];
		}
		if (digits.length <= 4) {
			return [0, Number(digits.slice(0, -2)), Number(digits.slice(-2))];
		}
		return [Number(digits.slice(0, -4)), Number(digits.slice(-4, -2)), Number(digits.slice(-2))];
	}

	const groups = cleaned.split(":").slice(0, 3).map((part) => part.slice(0, 2));
	if (groups.length === 1) {
		return [0, Number(groups[0] || "0"), 0];
	}
	if (groups.length === 2) {
		return [0, Number(groups[0] || "0"), Number(groups[1] || "0")];
	}
	return [Number(groups[0] || "0"), Number(groups[1] || "0"), Number(groups[2] || "0")];
}

export function readRaceClock(raw: string):
	| { status: "empty"; display: string }
	| { status: "invalid"; error: string; display: string }
	| { status: "ok"; totalSeconds: number; display: string } {
	const parts = clockParts(raw);
	if (!parts) {
		return { status: "empty", display: "00:00:00" };
	}

	const [hours, minutes, seconds] = parts;
	const display = [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
	if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
		return { status: "invalid", error: "Use a time like 3:30:00 or 50:00.", display: "00:00:00" };
	}
	if (minutes >= 60 || seconds >= 60) {
		return { status: "invalid", error: "Minutes and seconds must be between 0 and 59.", display };
	}

	const totalSeconds = hours * 3600 + minutes * 60 + seconds;
	if (totalSeconds <= 0) {
		return { status: "invalid", error: "Time must be greater than zero.", display };
	}

	return { status: "ok", totalSeconds, display };
}

export function parseDurationField(value: string): { hours: number; minutes: number } | null {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}

	if (trimmed.includes(":")) {
		const [hoursPart, minutesPart = "0"] = trimmed.split(":");
		const hours = Number(hoursPart);
		const minutes = Number(minutesPart);
		if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || minutes < 0 || minutes >= 60) {
			return null;
		}
		return { hours, minutes };
	}

	const digits = trimmed.replace(/\D/g, "");
	if (!digits) {
		return null;
	}
	if (digits.length <= 2) {
		const minutes = Number(digits);
		if (minutes >= 60) {
			return null;
		}
		return { hours: 0, minutes };
	}

	const minutes = Number(digits.slice(-2));
	const hours = Number(digits.slice(0, -2));
	if (minutes >= 60) {
		return null;
	}
	return { hours, minutes };
}

export function parsePaceField(value: string): number {
	const trimmed = value.trim();
	if (!trimmed) {
		return 0;
	}

	if (trimmed.includes(":")) {
		const [minutesPart, secondsPart = "0"] = trimmed.split(":");
		const minutes = Number(minutesPart);
		const seconds = Number(secondsPart);
		if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
			return 0;
		}
		return minutes * 60 + seconds;
	}

	const digits = trimmed.replace(/\D/g, "");
	if (!digits) {
		return 0;
	}
	if (digits.length <= 2) {
		return Number(digits) * 60;
	}
	const seconds = Number(digits.slice(-2));
	const minutes = Number(digits.slice(0, -2));
	if (seconds >= 60) {
		return 0;
	}
	return minutes * 60 + seconds;
}

export function fieldLook(value: string): { "data-filled"?: string; style: { width: string } } {
	const glyphs = Math.max(value.trim().length, 2);
	return {
		"data-filled": value.trim() ? "true" : undefined,
		style: { width: `${glyphs + 2}ch` }
	};
}

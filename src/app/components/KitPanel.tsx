"use client";

import { useEffect, useState } from "react";
import {
	applyKitFeedback,
	isRaining,
	recommendKit,
	weatherLabel,
	type KitFeedback,
	type KitSession
} from "../utils/kit";
import { fieldLook } from "./fields";

interface Place {
	name: string;
	label: string;
	latitude: number;
	longitude: number;
}

interface RunWeather {
	temperatureC: number;
	feelsLikeC: number;
	windKmh: number;
	raining: boolean;
	label: string;
}

interface HourSlot extends RunWeather {
	time: string;
}

const PLACE_KEY = "mileage-dress-place";
const OFFSET_KEY = "mileage-dress-offset";

const sessionSteps: Array<{ label: string; value: KitSession }> = [
	{ label: "Easy", value: "easy" },
	{ label: "Steady", value: "steady" },
	{ label: "Tempo", value: "tempo" },
	{ label: "Race", value: "race" }
];

function placeLabel(name: string, admin1?: string, country?: string): string {
	const region = admin1 && admin1 !== name ? admin1 : country;
	return region ? `${name}, ${region}` : name;
}

function hourKey(day: string, hour: number): string {
	return `${day}T${String(hour).padStart(2, "0")}:00`;
}

function weekdayName(day: string, style: "long" | "short"): string {
	return new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", { weekday: style });
}

export function KitPanel(): React.JSX.Element {
	const [query, setQuery] = useState("");
	const [places, setPlaces] = useState<Place[]>([]);
	const [place, setPlace] = useState<Place | null>(null);
	const [weather, setWeather] = useState<RunWeather | null>(null);
	const [hours, setHours] = useState<HourSlot[]>([]);
	const [nowStamp, setNowStamp] = useState("");
	const [day, setDay] = useState("");
	const [hour, setHour] = useState<number | null>(null);
	const [sessionIndex, setSessionIndex] = useState(1);
	const [offsetC, setOffsetC] = useState(0);
	const [note, setNote] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const savedOffset = Number(window.localStorage.getItem(OFFSET_KEY));
		if (Number.isFinite(savedOffset)) {
			setOffsetC(savedOffset);
		}
		const savedPlace = window.localStorage.getItem(PLACE_KEY);
		if (!savedPlace) {
			return;
		}
		try {
			const parsed = JSON.parse(savedPlace) as Place;
			if (parsed.name && Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude)) {
				setPlace(parsed);
				setQuery(parsed.label);
			}
		} catch {
			window.localStorage.removeItem(PLACE_KEY);
		}
	}, []);

	useEffect(() => {
		if (!place) {
			return;
		}
		const controller = new AbortController();
		setLoading(true);
		setError("");
		setHours([]);
		const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&forecast_days=7&timezone=auto`;
		fetch(url, { signal: controller.signal })
			.then((response) => {
				if (!response.ok) {
					throw new Error("Weather lookup failed");
				}
				return response.json() as Promise<{
					current?: {
						time?: string;
						temperature_2m?: number;
						apparent_temperature?: number;
						precipitation?: number;
						weather_code?: number;
						wind_speed_10m?: number;
					};
					hourly?: {
						time?: string[];
						temperature_2m?: number[];
						apparent_temperature?: number[];
						precipitation?: number[];
						weather_code?: number[];
						wind_speed_10m?: number[];
					};
				}>;
			})
			.then((data) => {
				const current = data.current;
				if (!current || current.apparent_temperature === undefined || current.temperature_2m === undefined) {
					throw new Error("Weather lookup failed");
				}
				const code = current.weather_code ?? 0;
				const precipitation = current.precipitation ?? 0;
				setWeather({
					temperatureC: current.temperature_2m,
					feelsLikeC: current.apparent_temperature,
					windKmh: current.wind_speed_10m ?? 0,
					raining: isRaining(code, precipitation),
					label: weatherLabel(code)
				});
				setNowStamp(current.time ?? "");
				const times = data.hourly?.time ?? [];
				setHours(times.flatMap((time, index) => {
					const feelsLikeC = data.hourly?.apparent_temperature?.[index];
					const temperatureC = data.hourly?.temperature_2m?.[index];
					if (feelsLikeC === undefined || temperatureC === undefined) {
						return [];
					}
					const hourCode = data.hourly?.weather_code?.[index] ?? 0;
					const hourRain = data.hourly?.precipitation?.[index] ?? 0;
					return [{
						time,
						temperatureC,
						feelsLikeC,
						windKmh: data.hourly?.wind_speed_10m?.[index] ?? 0,
						raining: isRaining(hourCode, hourRain),
						label: weatherLabel(hourCode)
					}];
				}));
			})
			.catch((fetchError: unknown) => {
				if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
					return;
				}
				setWeather(null);
				setError("Weather didn't load. Try the city again.");
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setLoading(false);
				}
			});
		return () => controller.abort();
	}, [place]);

	useEffect(() => {
		const trimmed = query.trim();
		if (trimmed.length < 2 || (place && trimmed === place.label)) {
			setPlaces([]);
			return;
		}
		const controller = new AbortController();
		const timer = window.setTimeout(() => {
			const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=5&language=en&format=json`;
			fetch(url, { signal: controller.signal })
				.then((response) => response.json() as Promise<{
					results?: Array<{ name: string; latitude: number; longitude: number; admin1?: string; country?: string }>;
				}>)
				.then((data) => {
					setPlaces((data.results ?? []).map((result) => ({
						name: result.name,
						label: placeLabel(result.name, result.admin1, result.country),
						latitude: result.latitude,
						longitude: result.longitude
					})));
				})
				.catch((fetchError: unknown) => {
					if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
						return;
					}
					setPlaces([]);
				});
		}, 280);
		return () => {
			controller.abort();
			window.clearTimeout(timer);
		};
	}, [query, place]);

	function choosePlace(next: Place): void {
		setPlace(next);
		setQuery(next.label);
		setPlaces([]);
		setNote("");
		setDay("");
		setHour(null);
		window.localStorage.setItem(PLACE_KEY, JSON.stringify(next));
	}

	function placeFromLookup(data: {
		city?: string;
		locality?: string;
		principalSubdivision?: string;
		countryName?: string;
		latitude?: number;
		longitude?: number;
	}): Place | null {
		if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) {
			return null;
		}
		const name = data.city || data.locality || "Here";
		return {
			name,
			label: name === "Here" ? "Current location" : placeLabel(name, data.principalSubdivision, data.countryName),
			latitude: data.latitude as number,
			longitude: data.longitude as number
		};
	}

	function useMyLocation(): void {
		setLoading(true);
		setError("");
		const url = "https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en";
		fetch(url)
			.then((response) => {
				if (!response.ok) {
					throw new Error("Location lookup failed");
				}
				return response.json() as Promise<{
					city?: string;
					locality?: string;
					principalSubdivision?: string;
					countryName?: string;
					latitude?: number;
					longitude?: number;
				}>;
			})
			.then((data) => {
				const next = placeFromLookup(data);
				if (!next) {
					throw new Error("Location lookup failed");
				}
				choosePlace(next);
			})
			.catch(() => {
				setLoading(false);
				setError("Couldn't find your location. Type a city instead.");
			});
	}

	function sendFeedback(feedback: KitFeedback): void {
		const nextOffset = applyKitFeedback(offsetC, feedback);
		setOffsetC(nextOffset);
		window.localStorage.setItem(OFFSET_KEY, String(nextOffset));
		if (feedback === "cold") {
			setNote("Next time I'll suggest something warmer.");
		} else if (feedback === "hot") {
			setNote("Next time I'll suggest something cooler.");
		} else {
			setNote("Locked in.");
		}
	}

	const forecastDays = [...new Set(hours.map((slot) => slot.time.slice(0, 10)))];
	const today = nowStamp.slice(0, 10);
	const activeDay = day || today;
	const activeHour = hour ?? Number(nowStamp.slice(11, 13) || 0);
	const selectedSlot = hours.find((slot) => slot.time === hourKey(activeDay, activeHour));
	const shown = selectedSlot ?? weather;
	const isNow = !day && hour === null;
	const whenLabel = isNow || !activeDay ? "Now" : `${weekdayName(activeDay, "long")} ${activeHour}:00`;
	const outfit = shown
		? recommendKit({
			...shown,
			temperatureC: Math.round(shown.temperatureC),
			feelsLikeC: Math.round(shown.feelsLikeC),
			windKmh: Math.round(shown.windKmh)
		}, offsetC, sessionSteps[sessionIndex]?.value ?? "steady")
		: null;
	const tuned = offsetC <= -2 ? "Warmer from how your runs felt." : offsetC >= 2 ? "Cooler from how your runs felt." : "";

	return (
		<section className="panel">
			<h2 className="toolTitle">Run kit</h2>
			<div className="kitStack">
				<div className="distanceButtons">
					<button type="button" onClick={useMyLocation}>
						Use my location
					</button>
				</div>
				<label>
					City
					<input
						type="text"
						value={query}
						placeholder="City"
						onChange={(event) => {
							setQuery(event.target.value);
							setPlace(null);
							setWeather(null);
							setNote("");
						}}
						onFocus={(event) => event.currentTarget.select()}
						{...fieldLook(query || "Barcelona")}
						data-filled={query.trim() ? "true" : undefined}
					/>
				</label>
				{places.length > 0 ? (
					<div className="distanceButtons" role="listbox" aria-label="Matching cities">
						{places.map((option) => (
							<button key={`${option.latitude}-${option.longitude}`} type="button" onClick={() => choosePlace(option)}>
								{option.label}
							</button>
						))}
					</div>
				) : null}
			</div>

			{forecastDays.length > 0 ? (
				<>
					<div className="distanceButtons kitDays" role="group" aria-label="Run day">
						<button type="button" className={isNow ? "active" : ""} onClick={() => { setDay(""); setHour(null); }}>
							Now
						</button>
						{forecastDays.map((forecastDay) => (
							<button
								key={forecastDay}
								type="button"
								className={!isNow && forecastDay === activeDay ? "active" : ""}
								onClick={() => {
									setDay(forecastDay);
									setHour((current) => current ?? 12);
								}}
							>
								{forecastDay === today ? "Today" : weekdayName(forecastDay, "short")}
							</button>
						))}
					</div>
					<div className="sliderWrap kitHour">
						<label htmlFor="kit-hour">{whenLabel}</label>
						<input
							id="kit-hour"
							type="range"
							min={0}
							max={23}
							step={1}
							value={activeHour}
							onChange={(event) => {
								setHour(Number(event.target.value));
								if (!day && today) {
									setDay(today);
								}
							}}
						/>
					</div>
				</>
			) : null}

			<div className="sliderWrap">
				<label htmlFor="kit-session">Session</label>
				<input
					id="kit-session"
					type="range"
					min={0}
					max={sessionSteps.length - 1}
					step={1}
					value={sessionIndex}
					onChange={(event) => setSessionIndex(Number(event.target.value))}
				/>
				<div className="ticks" role="group" aria-label="Session">
					{sessionSteps.map((item, index) => (
						<button
							key={item.value}
							type="button"
							className={index === sessionIndex ? "active" : ""}
							style={{ left: `calc(${index} * (100% - 14px) / ${sessionSteps.length - 1} + 7px)` }}
							onClick={() => setSessionIndex(index)}
						>
							{item.label}
						</button>
					))}
				</div>
			</div>

			{error ? <p className="toolError">{error}</p> : null}
			{loading ? <p className="fuelNote kitWait">{weather ? "Finding you…" : "Checking the weather…"}</p> : null}

			{shown && outfit ? (
				<div className="fuelResult">
					<p className="kitPlace">{place?.label}</p>
					<p className="kitConditions">
						{whenLabel}
						{" · "}
						{shown.label}
						{" · "}
						{Math.round(shown.temperatureC)}°
						{" · feels "}
						{Math.round(shown.feelsLikeC)}°
						{" · wind "}
						{Math.round(shown.windKmh)} km/h
					</p>
					<p className="kitLine">
						<span>Top</span>
						{outfit.top}
					</p>
					<p className="kitLine">
						<span>Legs</span>
						{outfit.legs}
					</p>
					{outfit.extras.map((extra) => (
						<p className="kitLine" key={extra}>
							<span>Also</span>
							{extra}
						</p>
					))}
					{tuned ? <p className="fuelNote">{tuned}</p> : null}
					<p className="kitAsk">How did this feel?</p>
					<div className="distanceButtons">
						<button type="button" onClick={() => sendFeedback("cold")}>Too cold</button>
						<button type="button" onClick={() => sendFeedback("right")}>Just right</button>
						<button type="button" onClick={() => sendFeedback("hot")}>Too hot</button>
					</div>
					{note ? <p className="fuelNote">{note}</p> : null}
				</div>
			) : null}
		</section>
	);
}

"use client";

import { useId } from "react";

const LED_PINK = "#ff2d92";

const SEGMENT_ON: Record<string, string> = {
	"0": "abcdef",
	"1": "bc",
	"2": "abdeg",
	"3": "abcdg",
	"4": "bcfg",
	"5": "acdfg",
	"6": "acdefg",
	"7": "abc",
	"8": "abcdefg",
	"9": "abcdfg"
};

const SEGMENTS: Record<string, [number, number, number, number]> = {
	a: [16, 3, 28, 14],
	b: [42, 16, 14, 32],
	c: [42, 56, 14, 32],
	d: [16, 87, 28, 14],
	e: [4, 56, 14, 32],
	f: [4, 16, 14, 32],
	g: [16, 45, 28, 14]
};

function Digit({ char }: { char: string }): React.JSX.Element {
	const patternId = `led-${useId().replace(/:/g, "")}`;
	const lit = SEGMENT_ON[char] ?? "";

	return (
		<svg className="ledGlyph" viewBox="0 0 60 104" aria-hidden="true">
			<defs>
				<pattern id={patternId} width="3" height="3" patternUnits="userSpaceOnUse">
					<rect width="3" height="1.15" fill={LED_PINK} />
				</pattern>
			</defs>
			{Object.entries(SEGMENTS).map(([name, [x, y, width, height]]) => {
				if (!lit.includes(name)) {
					return null;
				}
				return (
					<rect
						key={name}
						className="ledOn"
						x={x}
						y={y}
						width={width}
						height={height}
						fill={`url(#${patternId})`}
					/>
				);
			})}
		</svg>
	);
}

function Colon(): React.JSX.Element {
	const patternId = `led-${useId().replace(/:/g, "")}`;

	return (
		<svg className="ledColon" viewBox="0 0 18 104" aria-hidden="true">
			<defs>
				<pattern id={patternId} width="3" height="3" patternUnits="userSpaceOnUse">
					<rect width="3" height="1.15" fill={LED_PINK} />
				</pattern>
			</defs>
			<rect className="ledOn" x="3" y="32" width="12" height="14" rx="1" fill={`url(#${patternId})`} />
			<rect className="ledOn" x="3" y="60" width="12" height="14" rx="1" fill={`url(#${patternId})`} />
		</svg>
	);
}

export function LedTime({ time, size = "md" }: { time: string; size?: "md" | "sm" }): React.JSX.Element {
	return (
		<div className="ledTime" data-size={size}>
			{time.split("").map((char, index) =>
				char === ":" ? <Colon key={`${char}-${index}`} /> : <Digit key={`${char}-${index}`} char={char} />
			)}
			<style jsx>{`
				.ledTime {
					display: flex;
					align-items: center;
					justify-content: center;
					gap: 5px;
					width: 100%;
				}

				.ledTime :global(svg) {
					display: block;
					height: 62px;
					width: auto;
					overflow: visible;
				}

				.ledTime :global(.ledColon) {
					height: 62px;
					margin: 0 1px;
				}

				.ledTime[data-size="sm"] :global(svg),
				.ledTime[data-size="sm"] :global(.ledColon) {
					height: 42px;
				}

				.ledTime :global(.ledOn) {
					filter:
						drop-shadow(0 0 0.4px #ffe6f3)
						drop-shadow(0 0 1.6px rgba(255, 45, 146, 0.8));
				}
			`}</style>
		</div>
	);
}

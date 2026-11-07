import { ImageResponse } from "next/og";

export function appIcon(size: number): ImageResponse {
	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					background: "#ffffff",
					display: "flex",
					alignItems: "center",
					justifyContent: "center"
				}}
			>
				<svg width={size} height={size} viewBox="0 0 64 64">
					<path fill="#ff4d9a" d="M19 6h24l7 8v22c0 4-5 9-11 11H25c-6-2-11-7-11-11V14z" />
					<path fill="#ffffff" d="M19 6h11L25 13H16z" />
					<path fill="#70befa" d="M16 15h9l-2 3h-7z" />
					<ellipse cx="32" cy="47" rx="14" ry="11" fill="#ff8ec4" />
					<ellipse cx="27" cy="44" rx="4" ry="4.5" fill="#ffffff" opacity="0.55" />
				</svg>
			</div>
		),
		{ width: size, height: size }
	);
}

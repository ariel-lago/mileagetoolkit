import { ImageResponse } from "next/og";

export function appIcon(size: number): ImageResponse {
	const bar = Math.max(2, Math.round(size * 0.07));

	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					background: "#ff4d9a",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					color: "#ffffff",
					fontSize: Math.round(size * 0.58),
					fontWeight: 800,
					lineHeight: 1
				}}
			>
				<div style={{ display: "flex" }}>M</div>
				<div
					style={{
						width: Math.round(size * 0.38),
						height: bar,
						marginTop: Math.round(size * 0.06),
						background: "#70befa",
						borderRadius: bar,
						display: "flex"
					}}
				/>
			</div>
		),
		{ width: size, height: size }
	);
}

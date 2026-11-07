import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const grotesk = Space_Grotesk({
	subsets: ["latin"],
	weight: ["500", "600", "700"],
	variable: "--font-sans"
});

export const metadata: Metadata = {
	title: "Mileage Toolkit",
	description: "Running race prediction, pace zones, and fueling calculator"
};

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
	return (
		<html lang="en" className={grotesk.variable}>
			<body>{children}</body>
		</html>
	);
}

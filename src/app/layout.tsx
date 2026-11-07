import type { Metadata } from "next";
import { Syne } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const syne = Syne({
	subsets: ["latin"],
	weight: ["500", "600", "700", "800"],
	variable: "--font-sans"
});

export const metadata: Metadata = {
	title: "Mileage Toolkit",
	description: "Running race prediction, pace zones, and fueling calculator"
};

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
	return (
		<html lang="en" className={syne.variable}>
			<body>{children}</body>
		</html>
	);
}

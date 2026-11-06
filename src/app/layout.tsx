import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title: "Mileage Toolkit",
	description: "Running race prediction, pace zones, and fueling calculator"
};

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}

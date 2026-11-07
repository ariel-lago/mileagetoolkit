import type { ImageResponse } from "next/og";
import { appIcon } from "./components/appIcon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon(): ImageResponse {
	return appIcon(size.width);
}

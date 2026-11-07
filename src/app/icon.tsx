import type { ImageResponse } from "next/og";
import { appIcon } from "./components/appIcon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon(): ImageResponse {
	return appIcon(size.width);
}

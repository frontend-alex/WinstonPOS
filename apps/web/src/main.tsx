import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Providers } from "@/app/providers";
import "@/styles/style.css";

const root = document.getElementById("root");

if (!root) {
	throw new Error("The React root element was not found.");
}

createRoot(root).render(
	<StrictMode>
		<Providers />
	</StrictMode>,
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { electrobunView } from "./lib/app-rpc";
import "./index.css";
import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element #root was not found.");
}

void electrobunView;

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

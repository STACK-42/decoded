import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { startAnalytics } from "./lib/analytics";
import { startProgressSync } from "./lib/progressSync";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

startProgressSync();
startAnalytics();

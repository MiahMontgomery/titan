import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set theme to dark by default
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { SqlLiteProvider } from "./sqlite/useSqlLite";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <SqlLiteProvider>
    <App />
  </SqlLiteProvider>
);

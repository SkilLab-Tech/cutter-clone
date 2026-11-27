import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { routes } from "./routes";
import "./styles.css";

const container = document.getElementById("root");
if (container === null) {
  throw new Error("#root element missing from index.html");
}

const router = createBrowserRouter(routes);

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

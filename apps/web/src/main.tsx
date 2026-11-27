import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { createBrowserRouter, RouterProvider } from "react-router";
import { createI18n } from "./i18n";
import { routes } from "./routes";
import "./styles.css";

const container = document.getElementById("root");
if (container === null) {
  throw new Error("#root element missing from index.html");
}

const i18n = createI18n();
const router = createBrowserRouter(routes);

createRoot(container).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>
  </StrictMode>,
);

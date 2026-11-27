import { Link } from "react-router";
import { t } from "./i18n/t";

export function NotFound() {
  return (
    <section aria-labelledby="screen-title" data-screen="not-found">
      <h1 id="screen-title">{t("app.notFound.title")}</h1>
      <p>{t("app.notFound.body")}</p>
      <p>
        <Link to="/">{t("app.notFound.back")}</Link>
      </p>
    </section>
  );
}

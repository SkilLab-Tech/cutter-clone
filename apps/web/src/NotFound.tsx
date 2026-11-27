import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export function NotFound() {
  const { t } = useTranslation();
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

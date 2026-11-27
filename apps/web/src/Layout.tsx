import { NavLink, Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import { SCREENS } from "./screens/registry";

export function Layout() {
  const { t } = useTranslation();
  return (
    <>
      <a className="skip-link" href="#conteudo">
        {t("app.skipToContent")}
      </a>
      <header className="app-header">
        <p className="app-name">{t("app.name")}</p>
        <nav aria-label={t("app.nav")}>
          <ul>
            {SCREENS.map((s) => (
              <li key={s.id}>
                <NavLink to={s.path} end={s.path === "/"}>
                  {t(`screens.${s.key}.title`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}

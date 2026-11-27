import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { parseState, type ScreenDef, type ScreenState } from "./registry";

interface Props {
  screen: ScreenDef;
  /** Forces a state (tests). Otherwise read from `?estado=vazio|carregando|erro`. */
  state?: ScreenState;
}

export function ScreenPlaceholder({ screen, state }: Props) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const current = state ?? parseState(params.get("estado"));
  const k = `screens.${screen.key}`;

  return (
    <section aria-labelledby="screen-title" data-screen={screen.id} data-state={current}>
      <h1 id="screen-title">{t(`${k}.title`)}</h1>
      {current === "empty" && <p className="state state-empty">{t(`${k}.empty`)}</p>}
      {current === "loading" && (
        <p className="state state-loading" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          {t(`${k}.loading`)}
        </p>
      )}
      {current === "error" && (
        <div className="state state-error" role="alert">
          <p className="state-error-title">{t("state.errorTitle")}</p>
          <p>{t(`${k}.error`)}</p>
        </div>
      )}
    </section>
  );
}

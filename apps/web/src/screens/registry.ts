// The 10 screens of blueprint §4. Each one has empty / loading / error placeholders
// (constitution principle 4) until its own task fills it in.

export type ScreenId =
  "S-01" | "S-02" | "S-03" | "S-04" | "S-05" | "S-06" | "S-07" | "S-08" | "S-09" | "S-10";

export interface ScreenDef {
  id: ScreenId;
  /** Route path. S-01 is the index route. */
  path: string;
  /** i18n key prefix, e.g. "screens.inicio". */
  key: string;
}

export const SCREENS: readonly ScreenDef[] = [
  { id: "S-01", path: "/", key: "inicio" },
  { id: "S-02", path: "/plotter", key: "plotter" },
  { id: "S-03", path: "/calibracao", key: "calibracao" },
  { id: "S-04", path: "/montagem", key: "montagem" },
  { id: "S-05", path: "/vetorizar", key: "vetorizar" },
  { id: "S-06", path: "/imprimir", key: "imprimir" },
  { id: "S-07", path: "/cortar", key: "cortar" },
  { id: "S-08", path: "/materiais", key: "materiais" },
  { id: "S-09", path: "/historico", key: "historico" },
  { id: "S-10", path: "/sobre", key: "sobre" },
];

export type ScreenState = "empty" | "loading" | "error";

/** Query value (pt-BR, user-visible in the URL) → state. Used by tests and previews. */
export const STATE_PARAM: Readonly<Record<string, ScreenState>> = {
  vazio: "empty",
  carregando: "loading",
  erro: "error",
};

export function parseState(value: string | null): ScreenState {
  if (value === null) return "empty";
  return STATE_PARAM[value] ?? "empty";
}

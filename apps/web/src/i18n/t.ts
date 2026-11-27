// Minimal lookup used until i18next lands in T-008.
import ptBR from "./locales/pt-BR.json";

type Tree = { readonly [k: string]: string | Tree };

export function t(key: string): string {
  let node: string | Tree = ptBR as Tree;
  for (const part of key.split(".")) {
    if (typeof node === "string") return key;
    const next: string | Tree | undefined = node[part];
    if (next === undefined) return key;
    node = next;
  }
  return typeof node === "string" ? node : key;
}

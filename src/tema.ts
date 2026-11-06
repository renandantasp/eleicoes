/**
 * Tema claro/escuro. O tema e um atributo no <html>, para que o CSS troque
 * sozinho; a escolha fica salva e, sem escolha, segue o sistema.
 *
 * A primeira leitura acontece num script inline do index.html, antes do
 * primeiro render, para a pagina nao piscar branca no tema escuro.
 */

export type Tema = "light" | "dark";

const CHAVE = "ag-theme";

function doSistema(): Tema {
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function temaAtual(): Tema {
  const atual = document.documentElement.dataset.theme;
  return atual === "dark" || atual === "light" ? atual : doSistema();
}

export function aplicarTema(t: Tema) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(CHAVE, t);
  } catch {
    // modo privado ou armazenamento bloqueado: o tema vale so para esta sessao
  }
}

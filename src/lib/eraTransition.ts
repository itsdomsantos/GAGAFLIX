/**
 * Ponte entre o carrossel de eras (que sabe ONDE clicaste e a cor da era)
 * e o overlay global de transição (que faz a onda circular expandir).
 *
 * Um único overlay vive no layout raiz e regista-se aqui; qualquer link de
 * era chama `playEraTransition` para o disparar a partir da posição do rato.
 */
export type EraTransitionOpts = {
  /** Cor da era — pinta as tiras. */
  color: string;
  /** Destino da navegação. */
  href: string;
};

type Handler = (opts: EraTransitionOpts) => void;

let handler: Handler | null = null;

/** O overlay regista-se ao montar; devolve a função de limpeza. */
export function registerEraTransition(fn: Handler): () => void {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

/**
 * Dispara a transição. Devolve `true` se o overlay a assumiu (e portanto o
 * link deve cancelar a navegação nativa), `false` caso contrário.
 */
export function playEraTransition(opts: EraTransitionOpts): boolean {
  if (!handler) return false;
  handler(opts);
  return true;
}

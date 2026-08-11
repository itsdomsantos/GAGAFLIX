/**
 * Seleção de modelo do Gemini.
 *
 * Os nomes de modelo mudam e são descontinuados. Em vez de fixar um nome que
 * amanhã morre, perguntamos ao Google que modelos a chave tem disponíveis
 * (ListModels) e escolhemos o melhor "flash". O resultado fica em cache em
 * memória para não repetir o pedido a cada mensagem.
 */

const LIST_URL = "https://generativelanguage.googleapis.com/v1beta/models";

interface ApiModel {
  name?: string;
  supportedGenerationMethods?: string[];
}

let cached: string | null = null;

/** Lista os modelos que suportam generateContent (sem o prefixo "models/"). */
export async function listGenerateModels(key: string): Promise<string[]> {
  const res = await fetch(`${LIST_URL}?key=${key}&pageSize=200`);
  if (!res.ok) return [];
  const data = (await res.json()) as { models?: ApiModel[] };
  return (data.models ?? [])
    .filter((m) => m.name && m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name!.replace(/^models\//, ""));
}

/** Heurística: preferimos um "flash" estável e recente. */
export function preferModel(names: string[]): string | null {
  if (names.length === 0) return null;
  const score = (n: string) => {
    let s = 0;
    if (/flash/i.test(n)) s += 100; // rápido e barato — ideal para chat
    if (/latest/i.test(n)) s += 40; // aliases auto-atualizados
    if (/\b3\.|\b2\.5/i.test(n)) s += 15;
    if (/lite/i.test(n)) s -= 20;
    if (/(exp|preview|thinking|vision|embedding|aqa|image|tts|audio)/i.test(n)) s -= 80;
    return s;
  };
  return [...names].sort((a, b) => score(b) - score(a) || b.localeCompare(a))[0] ?? null;
}

/**
 * Devolve um modelo a usar. Ordem: override por env → cache → auto-descoberta.
 * `force` ignora a cache (usado quando o modelo em cache falhou com 404).
 */
export async function resolveModel(key: string, force = false): Promise<string | null> {
  const override = process.env.GEMINI_MODEL;
  if (override) return override;
  if (cached && !force) return cached;

  const discovered = preferModel(await listGenerateModels(key));
  if (discovered) cached = discovered;
  return discovered ?? cached ?? "gemini-2.5-flash";
}

/** Limpa a cache quando o modelo atual deixou de servir. */
export function invalidateModel() {
  cached = null;
}

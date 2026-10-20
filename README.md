# GAGAFLIX 🔥

**The Ultimate Lady Gaga Experience — by Little Monsters, to Little Monsters.**

Web app de streaming-catálogo dedicada ao universo Lady Gaga: performances ao vivo,
videoclipes, entrevistas e mais, organizados por Eras. O site **não aloja nem descarrega
vídeo** — cada vídeo aponta para um link (YouTube, Dailymotion, Vimeo, X, MP4/HLS direto…)
e o **Player Camaleão** escolhe o player certo automaticamente.

## Stack

- **Next.js (App Router) + TypeScript** — a aplicação
- **Tailwind CSS v4** — design system "Chrome Gothic" (tema MAYHEM, acento camaleão por era)
- **Supabase** — base de dados + login do painel de administração
- **hls.js** — player próprio para links diretos `.m3u8`
- **Vercel** — deploy (domínio: gagaflix.com)

## Como funciona

- `/` — hero cinematográfico (o vídeo em destaque) + rows por categoria
- `/eras` e `/eras/[slug]` — cada era com a sua paleta de cores
- `/watch/[id]` — página de vídeo com o Player Camaleão
- `/timeline` — a carreira de 2008 até hoje
- `/search` — pesquisa instantânea (atalho: tecla `/`)
- `/submit` — os fãs sugerem links de vídeos (caem na tua fila de aprovação)
- `/admin` — painel privado de gestão de conteúdo (não indexado, login obrigatório)
- `/admin/inbox` — fila de vídeos novos (do robô do YouTube e dos fãs): aprovar ou rejeitar

Sem Supabase configurado, o site funciona com conteúdo de arranque embutido
(`src/lib/seed.ts`). Com Supabase, todo o conteúdo passa a ser gerido no `/admin`.

## 🤖 Automação (100% grátis)

Tudo corre no **GitHub Actions** (grátis em repositórios públicos) e no teu
Supabase grátis. Sem cartão, sem chaves pagas.

| O quê | Quando | Onde está |
|---|---|---|
| **Robô do catálogo** — lê os feeds RSS dos canais do YouTube (sem chave), guarda os vídeos novos com "Gaga" no título na fila `/admin/inbox`, já com tipo e era sugeridos. Nada fica público sem a tua aprovação. Um vídeo rejeitado nunca volta a ser sugerido. | todos os dias, 05:23 UTC | `automation/catalog/` · lista de canais em `automation/channels.json` |
| **Autopiloto do Instagram** — **3 posts por dia**: às 11:37 e às 20:37 UTC uma **notícia da Lady Gaga** (fonte principal: [Lady Gaga Now](https://ladygaganow.net/news/); depois Billboard, Variety, Rolling Stone… — nunca a mesma história duas vezes, nem contada por outro site). Às 17:07 UTC o **post extra**: "N years ago today" / "Today: …" (timeline do site + [calendário do LGN](https://ladygaganow.net/events/1-lgn-calendar/?view=month) + os ~70 aniversários do LGN com o ano original e as datas repetidas verificadas, em `automation/anniversaries.json`); se não houver, os **vídeos acabados de entrar** no GAGAFLIX (1 post, carrossel se forem vários — nunca 1 post por vídeo); senão um **promocional** a rodar: From the vault → Era spotlight → **reel do site a funcionar** (o site verdadeiro filmado num telemóvel). | 11:37 · 17:07 · 20:37 UTC | `automation/social/` · fontes em `automation/news-sources.json` e `automation/calendar-sources.json` |
| **SEO** — `sitemap.xml`, `robots.txt`, títulos/descrições/imagens de partilha por vídeo e por era, e dados estruturados `VideoObject` (para os vídeos aparecerem nos resultados de vídeo do Google). | sempre | `src/app/sitemap.ts`, `robots.ts`, `/watch`, `/eras` |

Regras do autopiloto: nada é inventado — o texto vem da timeline e do catálogo
(que tu controlas) ou, nas notícias e no calendário, das palavras da própria
fonte (título e resumo dela), sempre creditada. Nunca usa clips dos vídeos: só
fotos das eras e thumbnails do catálogo, com crédito na legenda. (Nas notícias usa a
foto do próprio artigo quando existe, com crédito; para desligar, variável `NEWS_ARTICLE_IMAGES` = `0` — ver 8.4.) Legendas curtas, no máximo 1–2 emojis,
"link in bio", "Fan-made, non-profit." e hashtags no fim. O que já foi
publicado fica guardado em `site_settings` (chave `instagram_autopilot`), por
isso nada se repete.

**Modo de teste:** enquanto não houver chaves do Instagram, o autopiloto só
*desenha* o post e anexa-o à execução (Actions → a execução → **Artifacts**).

Para testar no teu computador (precisa de `npx playwright install chromium` e de ffmpeg para os reels):

```bash
npm run catalog -- --dry-run                     # o que o robô traria hoje
npm run social -- --dry-run --slot news          # a notícia que sairia agora → out/social/
npm run social -- --dry-run --slot extra         # o post extra de hoje
npm run social -- --dry-run --today 2026-10-21   # finge que é outro dia
npm run social -- --dry-run --slot reel          # força um formato: today | new | vault | era | reel
```

## Correr localmente

```bash
npm install
npm run dev
# abre http://localhost:3000
```

---

## ✅ A TUA PARTE (checklist do dono)

O código está pronto — estes passos são teus porque envolvem contas e chaves só tuas.

### 1. Criar o projeto Supabase (~5 min)

1. Vai a [supabase.com](https://supabase.com) → cria conta (grátis) → **New project**
2. Nome: `gagaflix` · escolhe uma palavra-passe de base de dados e guarda-a
3. Quando o projeto abrir: **SQL Editor → New query** → cola o conteúdo completo de
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**
   (isto cria as tabelas, a segurança e o conteúdo de arranque)

### 2. Criar o TEU login de admin

1. No Supabase: **Authentication → Users → Add user → Create new user**
2. Usa o teu email + uma palavra-passe forte → **Create user**
   (⚠️ marca "Auto Confirm User" se aparecer a opção)
3. É com este email/palavra-passe que entras em `gagaflix.com/admin`

### 3. Copiar as 2 chaves

No Supabase: **Project Settings → API** e copia:

- **Project URL** → vai para `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key** → vai para `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Para testar localmente: copia `.env.example` para `.env.local` e cola lá os valores.

### 4. Deploy na Vercel (~5 min)

1. Vai a [vercel.com](https://vercel.com) → **Add New → Project** → importa este repositório GitHub
2. Em **Environment Variables**, adiciona as 2 chaves do passo 3
3. **Deploy** — e já está no ar num domínio `.vercel.app`

### 5. Ligar o gagaflix.com

1. Na Vercel: **Project → Settings → Domains → Add** → `gagaflix.com`
2. A Vercel mostra-te os registos DNS a configurar no teu registrar do domínio
3. Aponta-os, espera uns minutos, e o GAGAFLIX está em casa 🏠

### 6. (Opcional) Importar playlists do YouTube

A ferramenta `/admin/import` funciona logo para colar links soltos (busca título e
thumbnail sozinha, sem chave). Para importar uma **playlist ou canal inteiro**, precisas
de uma chave grátis da YouTube Data API:

1. Vai a [console.cloud.google.com](https://console.cloud.google.com) → cria um projeto
2. **APIs & Services → Library** → ativa **YouTube Data API v3**
3. **APIs & Services → Credentials → Create credentials → API key** → copia a chave
4. Na Vercel: **Settings → Environment Variables** → adiciona
   `YOUTUBE_API_KEY` = a chave (sem `NEXT_PUBLIC_`, fica só no servidor) → **Redeploy**

Colar links individuais continua a funcionar sem esta chave.

### 7. Verificação automática de links (opcional)

O site verifica sozinho se os vídeos ainda existem no YouTube. Os que forem
removidos são **escondidos do público** e listados em **/admin/alerts** para
reveres (corrigir o link ou apagar). Nada é apagado automaticamente.

- O botão **"Check links now"** em /admin/alerts funciona **sem configuração**.
- Para correr **sozinho todos os dias** (Vercel Cron → `/api/health`), adiciona
  na Vercel (**Settings → Environment Variables**, sem `NEXT_PUBLIC_`):
  - `SUPABASE_SERVICE_ROLE_KEY` = a *service_role key* do Supabase
    (**Project Settings → API → service_role**; é secreta, só no servidor)
  - `CRON_SECRET` = uma palavra-passe qualquer à tua escolha (a Vercel envia-a
    automaticamente ao chamar o cron; protege o endpoint)

### 8. Ativar a automação (~10 min)

**8.1 — Criar a fila de vídeos e a pasta das imagens**

1. Abre o Supabase → o teu projeto → **SQL Editor → New query**
2. Abre o ficheiro [`supabase/automation.sql`](supabase/automation.sql) aqui no GitHub,
   copia **tudo** e cola na query → **Run**
3. Deve aparecer "Success". Confirma em **Table Editor** que existe a tabela `video_inbox`
   e em **Storage** que existe o bucket `social` (público)

**8.2 — Dar ao GitHub as chaves do Supabase**

1. No Supabase: **Project Settings → API**. Vais precisar de:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **service_role key** (carrega em "Reveal"). ⚠️ É secreta: nunca a coles em
     nenhum ficheiro nem a mostres a ninguém — só nos *secrets* do GitHub.
2. No GitHub, abre este repositório → **Settings** (separador no topo)
   → no menu da esquerda **Secrets and variables → Actions**
3. Carrega em **New repository secret** e cria, um de cada vez:
   - Name: `SUPABASE_URL` → Secret: o Project URL → **Add secret**
     (se já existir por causa do keep-alive, não precisas de o criar outra vez)
   - Name: `SUPABASE_SERVICE_ROLE_KEY` → Secret: a service_role key → **Add secret**

**8.3 — Testar o robô do catálogo**

1. No GitHub: separador **Actions** → à esquerda **Catalogue robot**
2. **Run workflow** → **Run workflow** (botão verde)
3. Espera ~1 minuto e abre a execução: o resumo mostra quantos vídeos novos
   encontrou em cada canal
4. Vai a `gagaflix.com/admin/inbox`: os vídeos estão lá à espera. Confirma o
   tipo e a era e carrega **Approve** (fica logo no site) ou **Reject**

A partir daqui corre sozinho todos os dias. Para seguir mais ou menos canais,
edita [`automation/channels.json`](automation/channels.json) (afinamos juntos a lista).

**8.3b — Pôr o robô a procurar no YouTube inteiro (recomendado, grátis)**

Sem chave, o robô só lê os canais da lista. Com a chave grátis da YouTube Data
API (não pede cartão; 10 000 unidades/dia chegam e sobram), ele pesquisa o
YouTube **todo**, em qualquer canal: as novidades dos últimos dias e, para
encher o arquivo, os vídeos mais vistos de um ano diferente por dia (2008 → hoje).
Filtra sozinho Shorts, covers, reactions, karaoke, lyric videos de fãs e vídeos
com poucas visualizações — e põe no máximo 40 por dia no Inbox, com as
visualizações e a duração de cada um.

1. Se já criaste a chave no passo 6, reutiliza-a. Senão:
   [console.cloud.google.com](https://console.cloud.google.com) → cria um projeto →
   **APIs & Services → Library** → **YouTube Data API v3** → **Enable** →
   **APIs & Services → Credentials → Create credentials → API key** → copia
2. No GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   → Name `YOUTUBE_API_KEY` → Secret: a chave → **Add secret**
3. Em `/admin/automation` carrega em **🔎 Find new videos now** e vê o Inbox

As pesquisas e os filtros estão em
[`automation/youtube-search.json`](automation/youtube-search.json) (palavras a
excluir, mínimo de visualizações, máximo por dia, canais bloqueados).

**8.4 — Testar o autopiloto do Instagram (modo de teste)**

1. **Actions → Instagram autopilot → Run workflow**
2. Em "What to post" escolhe `news` (uma notícia), `extra` (o post especial
   do dia) ou um formato (`today`, `new`, `vault`, `era`, `reel`), deixa
   **"Test run"** ligado → **Run workflow**
3. Quando acabar (2–4 min), abre a execução → em baixo, **Artifacts** →
   descarrega `instagram-…` → tens as imagens (ou o reel) e a legenda (`caption.txt`)

Enquanto não ligares o Instagram, as 3 execuções diárias fazem o mesmo:
desenham os posts e guardam-nos como artefacto, sem publicar.

**Vídeo de abertura do reel (opcional):** o reel abre com fotos da Gaga das
várias eras e "LADY GAGA" em grande. Para usares um vídeo teu por baixo desse
texto, põe um clip **vertical (9:16), 2–4 s, MP4** no repositório em
`automation/social/reel-intro.mp4` (GitHub → Add file → Upload files). Usa só
vídeo que possas usar (teu, ou de fã com autorização) — clips oficiais podem
fazer o Instagram silenciar ou retirar o reel.

As notícias usam a foto do próprio artigo quando o site a publica (com crédito
"Image via …" na legenda); senão, uma foto do catálogo, sempre diferente das
últimas 40. Para voltar só às fotos do catálogo: **Settings → Secrets and
variables → Actions → separador Variables → New repository variable** → Name
`NEWS_ARTICLE_IMAGES`, Value `0`.

**8.5 — Ligar o Instagram (fazemos juntos, passo a passo)**

Quando chegarmos lá, guio-te. Resumo do que vai ser preciso (igual ao The Vice City News):

- [ ] Conta do Instagram do GAGAFLIX como **profissional** (Criador ou Empresa)
- [ ] Ligada a uma **Página do Facebook**
- [ ] Uma app no developers.facebook.com e um **token de Página que não expira**
- [ ] Dois secrets novos no GitHub (como no 8.2): `INSTAGRAM_ACCESS_TOKEN` e `INSTAGRAM_USER_ID`

A partir desse momento, as execuções agendadas publicam de verdade (as execuções
manuais continuam em modo de teste, a não ser que desligues "Test run").

**8.6 — Google (opcional, grátis)**

1. Vai a [search.google.com/search-console](https://search.google.com/search-console) → adiciona `gagaflix.com`
2. Confirma o domínio (o Google dá-te um registo DNS para colar no teu registrar)
3. Em **Sitemaps**, submete `sitemap.xml`. O Google passa a descobrir cada vídeo novo sozinho

### 9. Botões de automação no /admin (~5 min)

Em **/admin/automation** tens botões para correr já o robô dos vídeos e para
publicar já no Instagram (notícia, post extra, reel) — sem esperar pelo horário.
O **Inbox** também tem o botão **🔎 Find new videos now**. Para os botões
funcionarem, o site precisa de uma chave do GitHub (grátis):

1. No GitHub, carrega na tua foto (canto superior direito) → **Settings**
2. No fundo do menu da esquerda: **Developer settings** → **Personal access tokens**
   → **Fine-grained tokens** → **Generate new token**
3. Preenche:
   - **Token name:** `gagaflix-admin-buttons`
   - **Expiration:** `No expiration` se aparecer; senão o máximo (e põe um lembrete para a renovar)
   - **Repository access:** **Only select repositories** → escolhe `GAGAFLIX`
   - **Permissions → Repository permissions → Actions:** **Read and write**
     (não mexas em mais nada)
4. **Generate token** → copia a chave (só aparece uma vez). ⚠️ É secreta: não a
   coles em ficheiros nem no chat.
5. Na **Vercel**: projeto gagaflix → **Settings → Environment Variables** →
   Key `GITHUB_DISPATCH_TOKEN` → Value: a chave → **Save**
6. **Deployments** → no último deploy carrega nos **⋯** → **Redeploy**

Pronto: abre `gagaflix.com/admin/automation` — vês os botões e as últimas
execuções (a correr / ✓ / ✗), com link para o GitHub.

### 10. Trailer do YouTube (60 s, 4K)

Um trailer cinematográfico do GAGAFLIX com música original gerada em código (sem
direitos de terceiros): abertura com cartões e pancadas ("17 YEARS." "13 ERAS."…),
o logo, e depois o **site verdadeiro no computador** a mostrar cada funcionalidade
numa batida (eras, vídeos, setlists, timeline, pesquisa, notícias, música, chatbot).
Só abre vídeos cujo player funciona.

- **Gerar:** `/admin/automation` → **🎞️ Make the YouTube trailer** (ou Actions →
  **YouTube trailer** → Run workflow). Demora ~30 min.
- **Descarregar:** abre a execução → **Artifacts** → `gagaflix-trailer-…` →
  `gagaflix-trailer.mp4`, `thumbnail.jpg` (capa 1280×720) e `youtube.txt`
  (título, descrição e tags prontos a colar).
- **A tua compilação na abertura:** põe o vídeo em
  `marketing/trailer/intro.mp4` (GitHub → Add file → Upload files). Entra mudo,
  por baixo dos cartões, nos primeiros ~12 s — a música é a do trailer. ⚠️ Imagens
  de videoclipes/concertos oficiais podem gerar reclamações de direitos no YouTube
  (Content ID); clips curtos e de fãs são mais seguros.
- Publicar no YouTube é à mão (o upload pela API exige aprovação da Google).

### 11. Logo

Adiciona os ficheiros do teu logo flame a `public/`:

- `public/logo.png` — o wordmark GAGAFLIX (fundo transparente)
- `public/monogram.png` — o "GF" (para favicon/mobile)

Depois diz e trocamos o placeholder tipográfico do header pelo logo real. Os
cartões e reels do Instagram usam `public/logo.png` automaticamente assim que existir.

---

*Site de fãs sem fins lucrativos. Todos os vídeos são reproduzidos a partir das
plataformas originais através de embeds/links — nada é alojado neste site.*

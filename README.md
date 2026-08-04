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
- `/admin` — painel privado de gestão de conteúdo (não indexado, login obrigatório)

Sem Supabase configurado, o site funciona com conteúdo de arranque embutido
(`src/lib/seed.ts`). Com Supabase, todo o conteúdo passa a ser gerido no `/admin`.

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

### 7. Logo

Adiciona os ficheiros do teu logo flame a `public/`:

- `public/logo.png` — o wordmark GAGAFLIX (fundo transparente)
- `public/monogram.png` — o "GF" (para favicon/mobile)

Depois diz e trocamos o placeholder tipográfico do header pelo logo real.

---

*Site de fãs sem fins lucrativos. Todos os vídeos são reproduzidos a partir das
plataformas originais através de embeds/links — nada é alojado neste site.*

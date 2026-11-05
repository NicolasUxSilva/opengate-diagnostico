# Diagnóstico de Operação — OpenGate

Experiência interativa de aquisição para **integradores de segurança eletrônica**. O visitante responde
seis perguntas sobre a própria operação e recebe uma leitura personalizada (resumo, pontos fortes,
principal oportunidade, recomendação e próximo passo). Ao mesmo tempo, um motor de regras classifica a
aderência ao programa de parceiros e decide a ênfase do encaminhamento para a landing page comercial.

Jornada: **Meta Ads → Diagnóstico → Resultado → Landing page da parceria → Formulário → Comercial.**

## Tecnologias

- Next.js 16 (App Router) + React 19 + TypeScript
- Zod (validação das respostas e da saída da IA)
- SDK oficial da Anthropic (`@anthropic-ai/sdk`) — opcional, só no servidor
- Playwright (testes unitários do motor e testes E2E em desktop e mobile)

Sem banco de dados e sem serviços pagos obrigatórios.

## Estrutura

```
src/
  app/
    page.tsx                 página única do diagnóstico
    layout.tsx               fontes, metadados e Meta Pixel (se configurado)
    globals.css              sistema visual (tokens da marca OpenGate)
    api/diagnostico/route.ts GET: IA ativa?  POST: valida → qualifica → texto (IA ou regras)
  config/
    questions.ts             perguntas e alternativas
    scoring.ts               pesos, notas, limites e critérios essenciais
    site.ts                  URL da landing page, parâmetros de campanha, Pixel
  lib/
    engine/validate.ts       validação e normalização das respostas
    engine/qualify.ts        motor de qualificação (determinístico)
    engine/narrative.ts      textos do resultado por regras + fatos permitidos sobre a OpenGate
    ai/interpret.ts          redação da leitura com IA (servidor) + guardas de conteúdo
    analytics.ts             eventos (Meta Pixel / dataLayer)
    utm.ts                   preservação de UTMs no link para a landing page
    rate-limit.ts            limite de requisições por IP
  components/                Intro, QuestionStep, Review, Processing, ResultView…
tests/
  unit/qualify.spec.ts       motor, textos, validação, guardas da IA, rate limit
  e2e/flow.spec.ts           fluxos reais no navegador (desktop e mobile)
docs/qualificacao.md         matriz de pontuação, regras e decisões a validar
```

## Executar localmente

Requisitos: Node.js 20.9+.

```bash
npm install
cp .env.example .env.local   # opcional: só para IA/Pixel/URL diferente
npm run dev                  # http://localhost:3000
```

## Variáveis de ambiente

| Variável | Onde | Padrão | Uso |
|---|---|---|---|
| `NEXT_PUBLIC_PARTNER_URL` | build | `https://opengate-integradores.vercel.app` | Destino do CTA. |
| `NEXT_PUBLIC_INSTITUTIONAL_URL` | build | `https://site-opengate.vercel.app` | Site institucional (logo e rodapé). |
| `ANTHROPIC_API_KEY` | servidor | vazio | Ativa a redação da leitura por IA. Sem ela, usa regras. |
| `AI_MODEL` | servidor | `claude-opus-5-5` | Modelo da Anthropic. |
| `AI_ENABLED` | servidor | `true` | `false` desliga a IA sem remover a chave. |
| `RATE_LIMIT_MAX` | servidor | `12` | Requisições por IP a cada 10 min (por instância). |
| `NEXT_PUBLIC_META_PIXEL_ID` | build | `351480523756375` | Meta Pixel ("Pixel Site OpenGate"). `off` desliga. |

Variáveis `NEXT_PUBLIC_*` são embutidas no build: depois de alterá-las na Vercel, faça um novo deploy.
Nunca coloque a chave da IA em uma variável `NEXT_PUBLIC_*`.

## Como a IA funciona

1. O servidor valida as respostas (`validate.ts`) e calcula o perfil por regras (`qualify.ts`).
2. Monta a leitura por regras (`narrative.ts`).
3. Se `ANTHROPIC_API_KEY` existir, envia ao modelo apenas as respostas (rótulos das alternativas), o perfil
   já calculado, a leitura por regras e uma lista fechada de fatos sobre a OpenGate. O modelo só reescreve
   o texto, em saída estruturada (JSON validado com Zod).
4. A saída é rejeitada se violar o esquema ou contiver valores em R$, percentuais, promessas, "aprovação",
   renda/lucro/faturamento, links ou contatos (`violatesContentRules`).
5. Qualquer falha (sem chave, erro de API, recusa, saída inválida, timeout de 25 s) devolve a leitura por
   regras. Se o próprio servidor falhar, o navegador calcula a leitura com o mesmo motor e avisa o visitante.

A IA **nunca** define o perfil, a ênfase do CTA ou os níveis exibidos. O navegador confere o perfil
devolvido pelo servidor com o cálculo local e descarta respostas divergentes.

O estado "Preparando sua leitura" só menciona IA quando ela está de fato configurada (`GET /api/diagnostico`).
A requisição usa `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`): se o modelo recusar por
política, a API tenta o modelo de reserva recomendado; se ainda assim recusar, vale a leitura por regras.

**Para ativar:** crie uma chave em console.anthropic.com e configure `ANTHROPIC_API_KEY` no ambiente de
produção da Vercel. Custo estimado: uma chamada curta por diagnóstico concluído.

## Alterar perguntas

Edite `src/config/questions.ts`. Para mudar só a redação, altere `title`, `help` e `label`. Se mudar ou
criar `id`s, atualize também `src/config/scoring.ts` (notas), os textos em `src/lib/engine/narrative.ts`
e rode `npm test` — a varredura de combinações aponta respostas sem nota ou sem texto.

## Alterar pesos e regras de classificação

Edite `src/config/scoring.ts` (`weights`, `optionScores`, `comercialMix`, `thresholds`, `gates`).
A documentação das regras e o que precisa de validação comercial estão em
[`docs/qualificacao.md`](docs/qualificacao.md). Depois de alterar, rode `npm run test:unit`.

## Editar os resultados

- Títulos e textos de abertura dos perfis: `profileMeta` em `narrative.ts`.
- Oportunidade, recomendação e próximo passo: objeto `blocks` em `narrative.ts`
  (chaves `a_<mercado>`, `b_<motivo>`, `c_<motivo>`).
- Pontos fortes e resumo: `buildStrengths` e as frases `*Phrase` em `narrative.ts`.
- Fatos permitidos sobre a OpenGate (também enviados à IA): `facts` em `narrative.ts`.
- Texto e ênfase do CTA por perfil: `ctaText` em `narrative.ts`; rótulo do botão em `src/config/site.ts`.

Regra editorial: só afirmar sobre o visitante o que ele respondeu e sobre a OpenGate o que está no site
ou na landing page. Nada de valores, ganhos ou aprovação garantida (os testes verificam).

## Landing page comercial

Configure `NEXT_PUBLIC_PARTNER_URL`. O link preserva `utm_source`, `utm_medium`, `utm_campaign`,
`utm_content`, `utm_term` e `fbclid` da URL de entrada e acrescenta `origem=diagnostico`. Nenhuma resposta
ou dado pessoal vai na URL.

## Analytics e Meta Ads

Pixel: **Pixel Site OpenGate (`351480523756375`)**, o mesmo da landing de integradores. Carregado em
`src/app/layout.tsx` (uma vez, com `next/script` + `noscript`), que envia o `PageView`. A página é única, sem
navegação client-side, então há um `PageView` por carregamento.

Eventos personalizados (`fbq('trackCustom')`, em `src/lib/analytics.ts`):

| Evento | Quando | Parâmetros |
|---|---|---|
| `DiagnosticStarted` | clique em "Começar diagnóstico" (não no carregamento) | — |
| `DiagnosticCompleted` | resultado calculado e exibido, uma vez por envio (recarregar não repete) | `perfil` (A/B/C) |
| `DiagnosticCTA` | clique no CTA para a landing (a navegação espera até 150 ms para o evento sair) | `perfil` (A/B/C) |

Nenhum deles é `Lead`: o diagnóstico qualifica, não converte. O `Lead` é disparado na landing de integradores,
só após o envio confirmado do formulário. Nenhuma resposta individual nem dado pessoal vai nos eventos ou na URL.

Funil: anúncio → `PageView` → `DiagnosticStarted` → `DiagnosticCompleted` → `DiagnosticCTA` → landing
(`PageView`, com `origem=diagnostico` e UTMs) → `Lead`.

Para usar os eventos personalizados em relatórios ou públicos na Meta, crie conversões personalizadas a partir
deles no Gerenciador de Eventos (eles só aparecem lá depois de recebidos). Se a página tiver um `dataLayer`
(GTM), os eventos também são enviados como `opengate_<Evento>`.

Testes: os E2E bloqueiam `connect.facebook.net` e trocam `fbq` por um registrador local, então nenhum evento
de teste chega à Meta. **Sem banner de consentimento:** avaliar a exigência de LGPD com o jurídico.

## Privacidade (LGPD)

- Não há cadastro: o diagnóstico não pede nome, contato nem dados de clientes finais.
- As respostas não são armazenadas no servidor. No navegador, ficam no `sessionStorage` da aba (para não
  perder o progresso ao recarregar) e são apagadas ao fechar a aba ou refazer o diagnóstico.
- Com a IA ativa, as respostas (apenas os rótulos das alternativas) são enviadas à Anthropic para redigir a
  leitura; o visitante é informado na tela inicial.
- Logs do servidor registram apenas o tipo de erro da IA, sem respostas.

## Testes

```bash
npm run typecheck
npm run build
npm test              # unitários + E2E desktop e mobile (sobe o build local na porta 3200)
npm run test:unit     # só o motor
E2E_BASE_URL=https://sua-url.vercel.app npx playwright test --project=desktop --project=mobile
```

Na primeira execução: `npx playwright install chromium chromium-headless-shell`.

## Limite de requisições

`POST /api/diagnostico` aceita até `RATE_LIMIT_MAX` requisições por IP a cada 10 minutos, em memória. Na
Vercel cada instância tem a própria memória, então é uma proteção de melhor esforço. Para um limite global,
troque `src/lib/rate-limit.ts` por um armazenamento compartilhado (por exemplo, Upstash Redis) ou use o
Firewall da Vercel.

## Publicar na Vercel

1. Importe o repositório do GitHub em vercel.com/new (framework detectado: Next.js; sem ajustes de build).
2. Configure as variáveis de ambiente desejadas (todas são opcionais).
3. Deploy. Cada push na branch principal gera um novo deploy de produção.
4. Valide a URL publicada: `E2E_BASE_URL=<url> npx playwright test --project=desktop --project=mobile`.

Alternativa por CLI: `npx vercel login`, `npx vercel link`, `npx vercel --prod`.

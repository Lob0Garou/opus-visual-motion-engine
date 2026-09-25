# PROVENANCE.md — rastreabilidade de todas as regras da skill

Formato: `[P:Lx-y]` = system prompt vazado do Opus 5.5 (public copy: https://github.com/asgeirtj/system_prompts_leaks/blob/main/Anthropic/claude-opus-5.5.md); `[S:cam]` = arquivo externo carregado em runtime ou da mesma família de leaks (S1 = `source\leaks\Anthropic\visualize.md`; S2 = `source\anthropic-skills\skills\frontend-design\SKILL.md`; S3 = `...\slack-gif-creator\SKILL.md`; S4 = `...\algorithmic-art\SKILL.md`; S5 = `...\canvas-design\SKILL.md`; S6 = `...\web-artifacts-builder\SKILL.md`; S7 = `...\webapp-testing\SKILL.md`); `[X]` = extensão recomendada pela skill, sem fonte no corpus. Confiança: D = direto, P = provável, X = sem fonte.

## SKILL.md — seção 0 (gate de leitura)

| Regra | Origem | Conf. |
|---|---|---|
| Ler a reference correspondente antes de codificar; check incondicional | [P:L1039] "Reading the relevant SKILL.md is a required first step before writing any code, creating any file, or running any other computer tool."; [P:L1197] "This check is unconditional" | D |

## Seção 1 — Pre-code planning (UI)

| Regra | Origem | Conf. |
|---|---|---|
| Mensagem visual primária + direção nomeada (paleta 4–6 hex, papéis tipográficos, tratamento de forma) | [S2:L47-51] "compact token system with color, type, layout, and principles… Color: 4–6 named hex values" | D |
| Direção ancorada no vernáculo do assunto | [S2:L13] "The subject's industry, subject matter, materials, and vernacular are where distinctive visual choices come from" | D |
| Hierarquia PRIMARY/SECONDARY/TERTIARY | [X] (formalização operacional de [S2:L59] "Let one element be the memorable thing…") | X |
| Progressão de seções | [X] (deriva de [S2:L50] layout concept) | X |
| Matemática pré-render: texto ≈ chars×8px @14px/500; box = max(title×8, subtitle×7)+24; +30–50% p/ símbolos | [S1:L153-158] csv de calibração; [S1:L203] fórmula; [S1:L254] special chars 30-50% | D |
| Espaçamento 60/24/12/10px | [S1:L256] | D |
| Colisão de setas checada antes de cada linha | [S1:L202] "Arrow intersection check… trace its coordinates against every box" | D |
| Animação só onde comunica | [S2:L32] "motion… only to draw attention"; [S1:L467] "not just move for the sake of moving" | D |

## Seção 2 — Pre-code planning (video)

| Regra | Origem | Conf. |
|---|---|---|
| Ordem brief → beats → cena → timeline → código | [X] (pipeline não existe no corpus; estrutura herdada de [S1:L476-481] composition approach e [S2:L47] two-pass) | X |
| 3–7 beats, um por ideia | [X] | X |
| Beat card com duração/composição/câmera/tipo/exit/primitivas | [X] | X |
| Timeline com timestamps absolutos | [X] | X |

## Seção 3 — Deterministic time

| Regra | Origem | Conf. |
|---|---|---|
| Animação = função pura de t; seek(t) + DURATION expostos | [X] (contrato de captura; corpus só exige determinismo implícito via [S4:L209] "Same seed ALWAYS produces identical output") | X |
| Proibição de setTimeout/setInterval/rAF como fonte de verdade | [X] | X |
| CSS só p/ loops ambientais, dentro de prefers-reduced-motion | [S1:L467] "@media (prefers-reduced-motion: no-preference)" | D |
| Seeds para aleatoriedade | [S4:L137-141] "ALWAYS use a seed for reproducibility; randomSeed(seed); noiseSeed(seed)" | D |

## Seção 4 — Stack decision tree

| Regra | Origem | Conf. |
|---|---|---|
| CSS transform/opacity para micro-motion; durações 0.2–0.6s; loops ≤2s | [S1:L467, L491-497]; [S1:L500] transition .2s | D |
| GSAP UMD pinado / WAAPI fallback | [X] (GSAP não citado no corpus; disciplina de UMD vem de [P:L1238] e [S1:L59]) | X |
| React: funcionais, sem props obrigatórias, default export, Tailwind core, sem storage | [P:L1155, L1167-1169] | D |
| Charts nativos quando existirem; Chart.js senão; hex hardcode em canvas | [P:L2938]; [S1:L733] "Canvas cannot resolve CSS variables" | D |
| Mermaid só para ERDs/class | [S1:L361] "ERDs only; everything else stays in SVG" | D |
| p5.js com seeds para arte generativa | [S4:L135-141] | D |
| Three.js UMD pinado; checar API da versão (r128 sem OrbitControls/CapsuleGeometry) | [P:L1156] "three (r128: THREE.OrbitControls unavailable; don't use THREE.CapsuleGeometry, it's r142+…)" | D |
| Escalar stack só quando o limite for atingido | [S1:L10] "Pick the closest fit" (princípio de escolha mínima) | P |
| Libs só de hosts permitidos, UMD pinado antes do script inline | [P:L1238] "A library such as React, Chart.js, D3 or three.js is loaded with a <script> tag for its UMD build… at an exact pinned version, placed before the inline script" | D |

## Seção 5 — Motion grammar

| Regra | Origem | Conf. |
|---|---|---|
| 5 movimentos (ENTER/EMPHASIS/TRANSITION/CAMERA/EXIT) | [X] taxonomia; conteúdo de cada: ENTER = [S2:L32] "A single orchestrated moment — one page-load sequence or one reveal"; TRANSITION = [S2:L32] "Motion that answers a person's action… shows what changed"; EMPHASIS = [S3:L170-174] pulse 0.8–1.2 + [S1:L497] glow .3↔.6 | D (moves 1-3), X (CAMERA/EXIT) |
| Stagger 60–120ms | [X] | X |
| Fade-up em tudo / hover em todo card = proibido | [S2:L32] "fade-and-slide-up entrances on each section and hover transitions on every card … read as AI-generated" | D |
| Ponto fixo do sistema: sem estado no meio | [X] | X |

## Seção 6 — Timing & easing

| Regra | Origem | Conf. |
|---|---|---|
| Vocabulário de easing (linear/ease_in/ease_out/ease_in_out/bounce_out/elastic_out/back_out) | [S3:L146-148] lista literal | D |
| Mapa de durações: 0.2s micro; 0.6/0.8s flicker (offset 0.15s); 1.6/2.1/2.6s fluxo; 3s glow; teto 2s | [S1:L491-497, L531-533, L467] | D |
| 0.3–0.5s padrão; stagger; câmera; count-up; exit | [X] | X |
| Nunca durações iguais em vizinhos | [X] (deriva do espírito de [S1:L242] "Each SVG streams in with its own animation" — camadas orgânicas dessincronizadas em [S1:L531-533]) | X |
| Nada anima sem propósito (mostra comportamento) | [S1:L467] "Animations should show how the system *behaves* — convection current, rotation, flow" | D |

## Seção 7 — Avoid generic AI design

| Regra | Origem | Conf. |
|---|---|---|
| Excesso de cards → card só objetos delimitados | [S1:L646-647] editorial vs card; [S2:L42] SaaS-card kit como tell | D |
| Grid previsível → variar | [S6:L20] "avoid … excessive centered layouts" (indireto) | P |
| Gradiente → flat; 1 gradiente só p/ propriedade física contínua | [S1:L27] "No gradients…"; [S1:L466] one-gradient exception | D |
| Glassmorphism sem função → remover | [S1:L43] "No… blur, glow"; [S1:L630] "no shadows (except functional focus rings)" | D |
| Centralização excessiva | [S6:L20] literal | D |
| Border-radius uniforme | [S6:L20] "uniform rounded corners"; tokens por nível [S1:L634, L53] | D |
| Tudo animando junto → stagger/sequência | [S1:L242] visual narrative step by step (indireto) + [X] valores | P/X |
| Duração idêntica em tudo | [X] | X |
| Hero genérico (número+label+gradiente) | [S2:L17] "a big number with a small label, supporting stats, and a gradient accent is the default treatment" | D |
| Ícones de enchimento | [S1:L42] "No emoji — use CSS shapes or SVG paths" + [S1:L147] "No icons or illustrations inside boxes" | D |
| Tipografia default (Inter, ALL-CAPS eyebrow, single-word accent) | [S6:L20] "and Inter font"; [S2:L25-28] tells 1-3; [S2:L43] ALL-CAPS eyebrow | D |
| Lista de tells (cream #F4F1EA/#D97757, acid-green, broadsheet, SaaS-kit, chrome: middle dots, 'WORD — fragment', #0B0B0B, mono labels, '→') | [S2:L38-45] calibração literal | D |
| Correção = escolha ancorada no assunto, anotada | [S2:L53] "revise that part, say what you changed and why" | D |

## Seção 8 — Technical constraints

| Regra | Origem | Conf. |
|---|---|---|
| Arquivo único; CSS/JS inline | [P:L1143] literal | D |
| ≤16 MB incl. dados embutidos; data: URIs | [P:L1238] | D |
| CDNs: cdnjs (preferred)/jsdelivr/tailwind/jquery; stylesheets só Google Fonts; fallback stack; resto falha silenciosamente | [P:L1238] literal | D |
| Tokens :root + dark em 3 camadas + body bg explícito | [P:L1240] literal | D |
| viewport-fit=cover; env(safe-area-inset-*); height:100% ≠ 100vh | [P:L1240] literal | D |
| Scroll lateral contido por bloco (overflow-x:auto) | [P:L1240] literal | D |
| minmax(0,1fr) | [S1:L650] literal | D |
| Sem localStorage no regime preview; estado em memória; storage publicado em try/catch | [P:L1167-1169]; [P:L1239] | D |
| Sem `<form>` em React; onClick/onChange | [P:L8113-8117] | D |
| ~~Line numbers display-only; old_str único; re-view pós-edit~~ (removida na v2: regra da ferramenta de edição do Claude, não de design) | [P:L2345-2346] | D |
| Round every displayed number; slider step | [S1:L638] literal | D |
| Foco visível, contraste, reduced motion, mobile | [S2:L59] "quality floor without announcing it: responsive down to mobile, visible keyboard focus, reduced motion respected, visually accessible" | D |
| Texto sobre fill colorido = stop escuro do mesmo ramp | [S1:L52, L113] | D |

## Seção 9 — Iterative visual loop

| Regra | Origem | Conf. |
|---|---|---|
| GENERATE→RENDER→OBSERVE→CRITIQUE→ADJUST→RENDER | [X] estrutura; ingrediente DIRETO: [S2:L59] "Critique your own work as you build, taking screenshots to review if your environment supports it — a picture is worth 1000 tokens" | D+X |
| Playwright headless + networkidle + screenshot full_page | [S7:L57-60, L69] | D |
| seek() nos marcos 0/25/50/75/100% | [X] | X |
| Sem browser → simular render (traçar coordenadas, recalcular fórmulas) | [X]; ingrediente DIRETO: [S1:L210] "Double-check coordinates before finalizing" | D+X |
| Não testar upfront sob pressão; corrigir proativamente | [S6:L70] "avoid testing the artifact upfront as it adds latency… Test later… if issues arise" | D |

## Seção 10 — Critique pass

| Regra | Origem | Conf. |
|---|---|---|
| Checklist de 12 dimensões | [X] (composição/hierarquia/tipografia/contraste/spacing derivados de [S1],[S2]; densidade de [S1:L12-17]; responsiveness/performance de [P:L1240]) | X+D |
| Pergunta final "intentionally designed, or merely generated?" | [X]; ingrediente DIRETO: [S2:L38] "AI-generated design right now clusters around some traits" (a distinção existe no corpus) | X+D |
| Refino = melhorar o que existe, não adicionar | [S5:L124] "avoid adding more graphics; instead refine what has been created" | D |
| "generated" → iterar | [S2:L53] revise-and-explain loop | P |

## Referências/Examples — pontos notáveis fora do SKILL.md

| Regra | Origem | Conf. |
|---|---|---|
| Subtítulos de caixa ≤5 palavras; ≤2 ramps; ≤4 caixas/fileira; decompor 6+ | [S1:L12-17, L262] | D |
| 1 SVG por unidade; substituir, nunca anexar | [S1:L141] | D |
| Ciclos nunca em anel → stepper | [S1:L264-266] | D |
| Metáfora espacial; funciona sem rótulos; teto ~6 segmentos | [S1:L446, L454-456] | D |
| Rótulos de um lado, ≥140px margem, leader lines | [S1:L472-474] | D |
| view viewBox 1:1; não encolher viewBox | [S1:L133-135] | D |
| Sentença: "don't chicken out into a flowchart" | [S1:L238] | D |
| Controles interativos quando o sistema real tem controle | [S1:L450] | D |
| CTA voz ativa, nome estável; erros direcionais | [S2:L67, L69] | D |
| Copy = conteúdo de design, não decoração | [S2:L63] | D |
| Texto mínimo como elemento visual (canvas/arte) | [S5:L79-82] | D |
| Filosofia/movimento nomeado antes do código (arte) | [S4:L36-44]; [S5:L35-43] | D |
| Film grammar (estabelece/detalhe/retorno; câmera 0.8–1.2s; leitura ≥1.2s/8 palavras; FLIP 0.6s) | [X] | X |
| Blur→sharp, backOut 1.7, FLIP | [X] | X |
| ffmpeg frame-sequence export; asset store mp4/webm ≤20 MB | [X]; metade DIRETA: [P:L1693] allowlist de assets | X+D |
| Audio fora do render(t) | [X] | X |

---

## v2 — refinamento para o DeepSeek Harness (2026-09-25)

Legenda nova: `[T]` = regra derivada de um defeito **reproduzido e detectado** por `scripts/qa.mjs` (teste de mutação: 8 bugs injetados no template, 8 detectados; exit 1 em FAIL).

| Mudança | Motivo | Origem |
|---|---|---|
| Descrição do frontmatter reescrita (480 chars) | o DSH trunca a descrição do catálogo em 500 (`catalogDescriptionMaxLength`); a antiga tinha ~560 e perdia os gatilhos | [T] doc `runtime/docs/subsystems/skills.md` |
| §8/§9 (QA + crítica): `scripts/qa.mjs` obrigatório, com ramo para modelo com visão (contact sheet) e só-texto (report.json) | DeepSeek V4 Pro é só-texto; o loop visual antigo exigia ler PNGs | [T] |
| §10 export: `scripts/export.mjs` (ffmpeg pipe, mp4/webm/gif, `--audio`) | o snippet antigo nomeava arquivos `f_0.25.png` e não montava vídeo | [T] 421 frames/14 s verificados com ffprobe |
| §2 template `assets/composition-template.html` | modelos mais fracos reescreviam o motor com bugs; o esqueleto elimina classes inteiras de erro | [X] |
| §3 draw-on exige `stroke-dasharray` | o exemplo original falhava nisto sem que a crítica humana visse | [T] check `dead-dash` |
| §3 `t` em segundos; `seek()` para o relógio de playback | bug de geração 1 (timeline congelada) + mutação `clock` | [T] checks `frozen`, `determinism` |
| §1 "signature moment" obrigatório no plano de vídeo | a crítica de narrativa só passava com legendas | [X] (deriva de [S1:L456] "works with the labels removed") |
| §6.6 piso de tipo 20px @1080p | tamanhos de widget (14px) apareciam em frames de vídeo | [X]; check `type-size` |
| typography §1: escala por meio (widget / página / vídeo) | a regra "h1 22px, pesos 400/500" (widget do visualize.md) contradizia os exemplos de vídeo (108–150px, peso 800) | [S1] para a linha widget; [X] para as demais |
| typography §3.1 e SKILL §7: acento de palavra permitido só com token semântico | os exemplos violavam o banimento absoluto | [X] |
| Removidas as regras específicas do Claude.ai (preview-regime storage, `old_str`, allowlist CSP como obrigação) | não se aplicam a arquivos locais no DSH | — |
| examples/motion-graphic.md: seção "Known defects" | o exemplo restaurado ao original reprova no QA; mantido como caso didático | [T] |

| Chromium lançado com `--disable-lcd-text` (qa + export) | antialiasing LCD gerava franjas coloridas: falso positivo `text-over-graphics` em texto pequeno e franjas no MP4 | [T] |
| overflow mobile comparado à largura nominal do device | com `isMobile` o Chromium amplia o layout viewport até caber o conteúdo; `innerWidth` virava 900 e o overflow passava | [T] |

Verificado na v2: template passa (0 FAIL/0 WARN); 8/8 mutações reprovadas no check certo (exit 1); modo página numa página de propósito ruim (contraste, overflow mobile, 7 tells de IA detectados); export mp4 14 s/421 frames e mp4+áudio 8 s/241 frames + AAC (ffprobe).
Não verificado na v2: Firefox/WebKit (só Chromium); `.webm`/`.gif` de saída; uma landing page real (só a página-teste sintética); a skill carregada de fato por uma sessão DSH (instalação adiada a pedido, para não contaminar o vídeo de controle).


# Grade — design system de "Araraquara em dois turnos"

Sistema visual do site que compara o 1º e o 2º turno da eleição presidencial de 2026 em Araraquara/SP, bairro a bairro, e situa a cidade entre os 5.715 municípios. Ele nasceu da opção **1a** do mockup (`Araraquara Dois Turnos.dc.html`) e tem tema claro e escuro (opção **2a**).

**Fontes usadas:** `uploads/Guia de interface - Araraquara em dois turnos.md` (o inventário de funcionalidades, invariantes e tokens atuais) e o [Carbon Design System](https://carbondesignsystem.com) como ponto de partida para grade, neutros e tipografia. Grade não é o Carbon: ele pega só a disciplina de célula e de neutros. Cores, legenda, componentes de dado e movimento são próprios do site.

**Logo:** não foi fornecido. O nome do site aparece em texto ("Araraquara em dois turnos", Plex Sans Light).

## Índice

| Caminho | O que é |
| --- | --- |
| `styles.css` | Ponto de entrada. Só tem `@import`s |
| `tokens/colors.css` | Neutros, chapas, cores semânticas; claro em `:root`, escuro em `[data-theme="dark"]` |
| `tokens/scales.css` | Rampas de dado de 5 passos (red, blue, green, amber, teal), iguais nos dois temas |
| `tokens/typography.css` · `spacing.css` · `motion.css` | Tipo, espaço/medidas fixas, duração/easing |
| `components/components.css` | Classes `ag-*` de todos os componentes, para usar com ou sem React |
| `components/core/` | `Tag`, `Tabs`, `MetricList`, `Segmented`, `Button` |
| `components/data/` | `Legend`, `VoteSplit`, `CandidateBars`, `StatTile`, `MiniStat`, `InlineBar` e `scales.js` (o algoritmo das faixas) |
| `components/feedback/` | `ProvenanceBar`, `Callout`, `WinnerBadge`, `MapTooltip` |
| `guidelines/*.html` | Cartões de cor, tipo, espaço e movimento |
| `guidelines/IMPLEMENTACAO.md` | **Guia de migração do site React atual** |
| `Araraquara Dois Turnos.dc.html` | O mockup: 2a (escuro), 1a/1b/1c (direções) |
| `SKILL.md` | Versão Agent Skill deste sistema |

**Adições intencionais** (não estão no guia original): `MetricList`, que troca os chips por uma lista vertical; `InlineBar`, que substitui o gráfico de 45 barras; `VoteSplit`, que dá forma visual ao voto a dois.

## Conteúdo e tom

- **Português do Brasil, frase em caixa normal.** Caixa alta só em rótulos mono curtos (`ELEIÇÃO PRESIDENCIAL 2026`, `OFICIAL`).
- **O leitor não é especialista.** Diga "local de votação", não "zona"; diga "bairro", não "NM_BAIRRO", exceto ao citar a fonte.
- **Frase gerada dos dados, e a virada dita em palavras:** "No 2º turno a cidade ficou com **Lula**, com 52,1% dos votos válidos — depois de **Flávio Bolsonaro** ter liderado o 1º turno com 45,8%."
- **Impessoal e direto.** Imperativo leve nas instruções ("Clique num círculo para abrir o bairro"). Sem "nós" e sem exclamação.
- **Números em pt-BR:** `169.890`, `52,08%`, `+2,8 pp`, `−4,2 pp` (sinal de menos de verdade, U+2212). Diferença entre percentuais é sempre **pp**, nunca "%".
- **Nomes curtos** ("Lula", "Flávio Bolsonaro") na interface. O nome do TSE sempre fica recuperável (`title`, tabela de chapas).
- **Ressalvas são conteúdo, não letra miúda:** "O bairro é o do local de votação, não o da residência."
- Sem emoji.

## Fundamentos visuais

- **Ideia central:** tudo é célula. As divisórias são `gap: 1px` sobre `--ag-border`, sem sombra nem raio (`--ag-radius: 0`). Os únicos círculos são dados: locais de votação e bolinha de chapa.
- **Cor:** neutros frios do Carbon (gray 10–100). Cor saturada é só de dado: chapas (`--ag-lula #d92b3a`, `--ag-flavio #1f4e9c`), rampas de faixa e o violeta de destaque de Araraquara. Cor de chapa só aparece em métrica que opõe as duas chapas. Abstenção é verde; comparecimento vai de âmbar a verde-azulado.
- **Escuro:** as camadas vão de `#161616` (fundo) para `#262626` (superfície). As cores de dado **não mudam**, então a legenda e os mapas continuam comparáveis. Só a cor de chapa usada como *texto* clareia (`--ag-lula-text #f08a8c`, `--ag-flavio-text #8fb0e6`) para manter o contraste.
- **Tipografia:** IBM Plex Sans (300 para números grandes, 600 para títulos e abas) e IBM Plex Mono para fonte, unidade, rótulo e número de tabela. `tabular-nums` em tudo.
- **Procedência:** faixa escura *sticky* no topo e uma etiqueta mono de fonte junto da legenda, que muda com a métrica. Blocos de "Sobre os dados" levam etiquetas Oficial, Ressalva e Apresentação.
- **Fundos:** chapados. O mapa usa tiles do OSM dessaturados (no escuro, invertidos) e uma grade de 40 px no estado vazio. Sem gradiente, textura ou imagem.
- **Movimento:** cor dos círculos em 700 ms, numa **onda** que parte do Centro (atraso = distância × 1,8 ms). Barras e posições em 600 ms, abas em 240 ms, hover em 110 ms. Easing `cubic-bezier(.2,0,.38,.9)`. Sem bounce. `prefers-reduced-motion` zera tudo.
- **Hover:** fundo `--ag-control-hover` em linhas e métricas; opacidade .85 em botões. **Ativo/pressionado:** bloco preenchido invertido (`--ag-control-on-bg`).
- **Foco:** contorno interno de 2 px em `--ag-focus`.
- **Transparência:** só no mapa (círculos .9, não selecionados .22, controles .92) e no overlay de "Ctrl + roda". Sem blur.
- **Layout:** trilho de métricas com 220 px, mapa fluido, painel de 380 px *sticky*. Abaixo de 1080 px tudo empilha e as métricas viram uma linha rolável.
- **Cartões:** célula branca (ou `#262626`) sem borda própria; a grade de 1 px faz a separação.

## Iconografia

O sistema não usa um conjunto de ícones. Os glifos são caracteres Unicode tipográficos: `↑ ↓` (polos da legenda), `→` (ordem, link), `×` (limpar), `↻` (mudou de lado, na tabela) e `●` (bolinha de cor feita em CSS). Se precisar de ícones, a sugestão é `@carbon/icons-react` em 16 px, com traço compatível com o Plex. **Isso ainda não foi aplicado nem validado.**

## Caveats

- As fontes vêm do Google Fonts. Para produção, faça self-host (`@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`).
- A aba Brasil (Insights) e o mobile ainda não foram desenhados no mockup. Os tokens e componentes já cobrem as listas: linha de 34 px, `Callout` "destaque" e `Segmented`.

# Guia de implementação — migrar o site para o Grade

Este guia é para quem mantém a aplicação React atual, com Leaflet e Recharts. Ele vale junto com o `Guia de interface` original: **os nove invariantes continuam valendo** e estão de novo no checklist do fim.

A migração foi pensada em PRs pequenos e independentes, na ordem da seção 10.

---

## 1. Instalar os tokens

1. Copie `tokens/` e `components/components.css` para `src/styles/grade/`.
2. Importe uma vez, no ponto de entrada:
   ```js
   import './styles/grade/styles.css'; // ajuste os caminhos dos @import
   ```
3. Envolva o app com a classe raiz:
   ```jsx
   <div className="ag-root">…</div>
   ```
4. Fontes: troque o `@import` do Google em `fonts.css` por self-host:
   ```bash
   npm i @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono
   ```
   ```js
   import '@fontsource/ibm-plex-sans/300.css'; import '@fontsource/ibm-plex-sans/400.css';
   import '@fontsource/ibm-plex-sans/500.css'; import '@fontsource/ibm-plex-sans/600.css';
   import '@fontsource/ibm-plex-mono/400.css'; import '@fontsource/ibm-plex-mono/500.css';
   ```

### De → para (tokens atuais)

| Hoje | Grade |
| --- | --- |
| fundo `#f7f5f1` | `--ag-bg` |
| superfície branca | `--ag-layer` |
| texto `#1c1c21` | `--ag-text-1` |
| texto suave `#63636d` | `--ag-text-3` (rótulos) / `--ag-text-helper` (notas) |
| bordas `#e3dfd7` | `--ag-border` |
| positivo `#1a7f4b` / negativo `#b8352c` | `--ag-positive` / `--ag-negative` |
| raio 10 px | `--ag-radius` (0) |
| sombra discreta | removida; use a grade de 1 px (`.ag-grid`) |
| fonte do sistema | `--ag-font-sans` / `--ag-font-mono` |
| Lula `#d92b3a`, Flávio `#1f4e9c`, destaque `#7322a8` | `--ag-lula`, `--ag-flavio`, `--ag-destaque` (mesmos valores) |

---

## 2. Dark mode

O tema é um atributo no `<html>`. O padrão segue o sistema, e a escolha do usuário fica salva.

```js
// src/theme.js
const KEY = 'ag-theme';
export function initTheme() {
  const saved = localStorage.getItem(KEY);
  const sys = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = saved || sys;
}
export function setTheme(t) { localStorage.setItem(KEY, t); document.documentElement.dataset.theme = t; }
```

Chame `initTheme()` **antes** do primeiro render (no `index.html`, num script inline), para não piscar. O alternador fica na faixa de procedência e usa `Segmented` ("Claro / Escuro").

### Regras do escuro

- **As cores de dado não mudam.** Rampas, chapas como *preenchimento* e violeta como preenchimento continuam iguais, para que os mapas claro e escuro se comparem a olho.
- **A cor de chapa usada como texto muda.** Nunca escreva `color: var(--ag-lula)`; use `--ag-lula-text` e `--ag-flavio-text`. No escuro, `#1f4e9c` sobre `#262626` não passa em contraste.
- **No mapa escuro, o contorno dos círculos é escuro** (`--ag-dot-ring`) e o selecionado é claro. Os tiles ganham `filter: grayscale(1) invert(1) brightness(.78) contrast(.9)`, que já está em `components.css` via `.ag-map .leaflet-tile-pane`.
- **O tooltip inverte:** claro no escuro, escuro no claro.

---

## 3. Layout

```
ProvenanceBar (sticky, top 0)
Header: rótulo mono · título 44/300 · frase gerada
Tabs
.ag-shell  [MetricList 220px | Mapa + Legend | Painel 380px sticky]
.ag-grid   cartões de totais (4 ou 6)
Tabela dos 45 bairros com InlineBar (substitui gráfico + tabela)
Sobre os dados
```

- **O gráfico de 45 barras sai.** A barra da métrica ativa entra como coluna da tabela (`InlineBar`), com a mesma cor de faixa do mapa. Isso tira cerca de 950 px de página e **permite remover o Recharts** (boa parte dos 886 KB do bundle). As barras do município (13 chapas) viram `CandidateBars`, que é HTML puro.
- A tabela continua ordenável por qualquer cabeçalho. Use `aria-selected` na linha selecionada. A coluna "locais" mostra quantos círculos formam o bairro, o que resolve o problema 6 do guia.
- O painel fica *sticky* em `top: 40px`, logo abaixo da faixa de procedência.
- Abaixo de 1080 px tudo empilha e a `MetricList` vira uma linha rolável (já no CSS). Abaixo de 640 px a legenda põe o rótulo do polo acima das 5 células.

---

## 4. Componentes: o que substitui o quê

| Hoje | Grade |
| --- | --- |
| Faixa verde de procedência | `ProvenanceBar` (escura, sticky, com link para as ressalvas) |
| Chips de métrica | `MetricList` (lista vertical, nome + unidade) |
| Botões de enquadramento | `Segmented` |
| Legenda de faixas | `Legend` + `legendRows()` de `scales.js` |
| Cartões de totais | `StatTile` dentro de `.ag-grid` |
| Barras por candidato | `CandidateBars` |
| Mini-indicadores | `MiniStat` em `.ag-grid` de 2 colunas |
| Selo do vencedor | `WinnerBadge` |
| Aviso amarelo "mudou de lado" | `Callout tone="flip"` |
| Bloco azul do efeito mecânico | `Callout` (neutro) + `VoteSplit` |
| Alerta violeta (Insights) | `Callout tone="destaque"` |
| Etiquetas Oficial / Apresentação / Ressalva | `Tag kind="oficial" \| "apresentacao" \| "ressalva"` |
| Gráfico de barras por bairro | **removido** → `InlineBar` na tabela |
| — (novo) | `VoteSplit` sempre no painel (cidade quando não há seleção) |

Os componentes usam só as classes `ag-*`, então dá para adotar o CSS antes de trocar o JSX.

---

## 5. O mapa (Leaflet)

Ponha a classe `ag-map` no contêiner do `MapContainer`.

### Círculos

```js
import { dotRadius, bandOf, colorVar, cssVar } from './grade/scales.js';
const k = clamp(pxPorKm / 58, 0.45, 1.2);  // ou fixe por enquadramento: núcleo ≈ 1, município ≈ .45
L.circleMarker([lat, lng], {
  radius: dotRadius(local.eleitores, maxEleitoresLocal, k), // 3,5 → 17,5 px (era 5 → 26)
  fillColor: cssVar(colorVar(metric, scale, bandOf(v, scale))),
  fillOpacity: selecionado && !doBairro ? 0.22 : 0.9,
  color: cssVar(doBairro ? '--ag-dot-ring-selected' : '--ag-dot-ring'),
  weight: localClicado ? 3 : doBairro ? 2 : 1,
});
```

- **Raios menores e preenchimento a 0,9** reduzem bastante a sobreposição no núcleo urbano. Continue desenhando os maiores primeiro e chame `bringToFront()` nos círculos do bairro selecionado.
- **Releia as cores quando o tema mudar.** Use um `MutationObserver` no `data-theme` do `<html>`, ou guarde o tema no estado e passe `cssVar(...)` de novo.

### A onda de cor

Leaflet desenha SVG `<path>`, e `components.css` já aplica `transition: fill 700ms` em `.leaflet-interactive`. Para a onda, defina o atraso por círculo **ao trocar turno ou métrica**:

```js
const c = map.latLngToLayerPoint(centroideCentro);
layer.getElement().style.transitionDelay =
  Math.round(layer._point.distanceTo(c) * 1.8) + 'ms'; // use --ag-wave-step
```

Ao passar o mouse, zere o atraso para que o hover responda na hora. Com `prefers-reduced-motion`, as durações já viram 0.

### Controles do mapa

- **Enquadramentos:** `Segmented` no canto superior direito, com a regra dos 95% inalterada. No núcleo urbano, mostre a nota mono "3 locais rurais fora do quadro · 1.061 eleitores".
- **Mini-escala:** `.ag-scale-key` no canto inferior esquerdo, com fundo `--ag-map-control-bg`.
- **"Limpar seleção ×":** `Button` primary no canto inferior direito.
- **Ctrl + roda:** comportamento igual ao de hoje; o overlay é `.ag-map__hint`, com duração `--ag-hint-ms`.
- **Tooltip:**
  ```js
  bindTooltip(html, { className: 'ag-tooltip', direction: 'right', offset: [10, 0] })
  ```
  Remova o fundo e a borda padrão do Leaflet:
  ```css
  .leaflet-tooltip.ag-tooltip { border: 0; border-radius: 0; box-shadow: none; padding: 10px 12px }
  .leaflet-tooltip.ag-tooltip::before { display: none }
  ```

### Opcional (exploração 1c): agrupar por bairro

Um círculo por bairro, no **centróide ponderado das coordenadas reais dos locais**, com o número de locais no centro. Só entra se ficar rotulado como "Bairros (centróide dos locais)" e nunca como área. Não reintroduza polígonos.

---

## 6. Legenda e faixas

`components/data/scales.js` reproduz o algoritmo atual: passo redondo mais próximo em 1, 2, 2,5, 5 ou 10; p95 para as divergentes; p2/p98 para as sequenciais; exclui unidades sem eleitorado.

Há uma correção: **as casas decimais saem do passo** (`decimalsFor`). Com passo 0,25, a faixa é escrita "+0,25 a +0,50", e não "+0,3 a +0,5".

```js
const sc = buildScale(valoresDosBairrosComEleitorado, metric.type); // %: junte 1º e 2º turnos
const counts = contarBairrosPorFaixa(sc);                            // 10 ou 5 posições
<Legend title={metric.label} unit={metric.unit} rows={legendRows(metric, sc, counts)}
        footnote={'número no quadrado = bairros na faixa · TSE ' + metric.src} />
```

O formato da métrica muda de rampa para nomes de rampa:

```js
{ id: 'vant',  label: 'Vantagem', unit: 'pp', type: 'div',
  pos: ['Lula à frente', 'red'], neg: ['Flávio à frente', 'blue'],
  src: 'votacao_secao_2026_BR · QT_VOTOS' }
{ id: 'abst',  label: 'Abstenção', unit: '% do eleitorado', type: 'seq', ramp: 'green' }
{ id: 'comp',  label: 'Mudança no comparecimento', unit: 'eleitores', type: 'div',
  pos: ['subiu', 'teal'], neg: ['caiu', 'amber'] }
{ id: 'gF',    label: 'Votos ganhos por Flávio', type: 'div',
  pos: ['ganhou', 'blue'], neg: ['perdeu', 'red'] }  // mesmos cortes de gL, cor invertida
```

**Fonte ao lado da legenda:** cada métrica ganha um campo `src` (o arquivo e o campo do TSE), mostrado no rodapé da legenda. É o que cumpre "procedência no momento em que olha".

---

## 7. Voto a dois

O `VoteSplit` fica **sempre** no painel, nas três abas de mapa. Sem bairro selecionado, mostra a cidade (49,4% → 52,1%). Com bairro, mostra o bairro e o texto "+X pp para Lula no voto a dois".

Na aba Diferença, ele aparece antes de qualquer número. Isso responde ao problema 5 do guia: o conceito chega pela forma antes de chegar pelo texto.

---

## 8. Listas virtualizadas (Insights)

- **A altura da linha continua uniforme:** `--ag-row-h: 34px`. A constante do componente precisa ser a mesma:
  ```js
  const ROW_H = 34; // = --ag-row-h
  ```
  Se mudar uma, mude a outra.
- A linha de Araraquara usa `background: var(--ag-destaque-bg)`, `color: var(--ag-destaque-text)`, um marcador quadrado de 8 px em `--ag-destaque` e uma barra lateral `box-shadow: inset 3px 0 0 var(--ag-destaque)`.
- "Percentual / Absoluto" e "maiores / menores" usam `Segmented`.

---

## 9. Acessibilidade

- Todos os alternadores continuam nativos, com `aria-pressed` (métricas, segmentados) ou `aria-current` (abas). Os componentes já fazem isso.
- `VoteSplit` tem `role="img"` com `aria-label` por extenso. `WinnerBadge` traz o nome escrito. A legenda traz o intervalo escrito.
- **Contraste:**
  - texto `--ag-text-3` sobre `--ag-layer`: ≥ 7:1 (claro) / ≥ 9:1 (escuro);
  - `--ag-lula-text` e `--ag-flavio-text` sobre `--ag-layer`: ≥ 4,5:1 nos dois temas;
  - número dentro da célula da legenda: `--ag-scale-ink-light` nas faixas 1–3 e `--ag-scale-ink-dark` nas faixas 4–5.
- **Foco:** `:focus-visible` com contorno interno de 2 px em `--ag-focus`.

---

## 10. Ordem sugerida de PRs

1. **Tokens + fontes + `ag-root`.** Só troca de valores; o layout fica igual.
2. **Dark mode:** `initTheme`, alternador, cores-texto de chapa, tiles.
3. **Procedência:** `ProvenanceBar` sticky e `src` por métrica no rodapé da legenda.
4. **Legenda:** `scales.js` + `Legend`, incluindo a correção de decimais.
5. **Mapa:** raios menores, opacidade, anéis por token, onda de cor, tooltip.
6. **Painel:** `VoteSplit`, `CandidateBars`, `MiniStat`, `WinnerBadge`, `Callout`.
7. **Tabela com `InlineBar`;** remover o gráfico de 45 barras e o Recharts.
8. **Layout de 3 colunas** (`.ag-shell`) e `MetricList`.
9. **Insights:** linhas de 34 px, destaque violeta, `Segmented`.

---

## Checklist de invariantes (revisar em todo PR)

- [ ] Nenhuma área de bairro pintada, nenhuma fronteira inventada, nenhum valor estimado.
- [ ] Procedência visível sem clique: `ProvenanceBar` + fonte na legenda.
- [ ] As três ressalvas presentes: bairro = local de votação; percentual entre turnos engana; crescimento é quase universal.
- [ ] Lacunas declaradas: Penitenciária sem coordenada; 2 seções agregadas.
- [ ] Cor de chapa só em métrica partidária; comparecimento em âmbar ↔ verde-azulado; abstenção em verde.
- [ ] Legenda com 10 faixas (divergente) ou 5 (sequencial), sempre; mesma escala no 1º e no 2º turno; **mesmas cores nos dois temas**.
- [ ] Faixas das pontas abertas.
- [ ] A cor nunca é o único portador de informação.
- [ ] Nome do TSE recuperável (`title` e tabela de chapas em "Sobre os dados").

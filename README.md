# Araraquara em dois turnos — eleição presidencial 2026

Aplicação React que compara a votação do 1º e do 2º turno por bairro de
Araraquara/SP, com mapa interativo, e põe o município no contexto dos 5.715
municípios do país.

**No ar:** <https://renandantasp.github.io/eleicoes/>

**Todos os números vêm do TSE.** Nenhum valor é estimado, geocodificado ou
interpolado.

## Resultado em Araraquara

| | 1º turno (04/10/2026) | 2º turno (25/10/2026) |
| --- | --- | --- |
| Lula (13) | 56.181 — 44,82% | **68.699 — 52,08%** |
| Flávio Bolsonaro (22) | **57.432 — 45,82%** | 63.218 — 47,92% |
| Comparecimento | 133.193 | 137.611 |
| Abstenção | 21,60% | 19,00% |
| Brancos + nulos | 7.856 | 5.694 |

Eleitorado: 169.890, em 45 bairros, 67 locais de votação e 604 seções.

Flávio Bolsonaro liderou o 1º turno na cidade por 1 ponto; Lula venceu o 2º por
4,2. No voto a dois, Araraquara saiu de 49,4% para 52,1% a favor de Lula —
**todos os 45 bairros** se deslocaram no mesmo sentido, e 12 mudaram de lado.
No país o deslocamento foi de +2,8 pp, praticamente o mesmo.

## Rodando

```bash
npm install
```

```bash
npm run dev
```

Abre em `http://localhost:5173`. O mapa base vem do OpenStreetMap, então a
primeira carga precisa de internet.

## As cinco abas

**1º turno**, **2º turno** e **Diferença** compartilham a mesma estrutura:
cartões com os totais da cidade e, abaixo, duas sub-abas.

- *Mapa e bairros* — os 67 locais como círculos de área proporcional ao
  eleitorado, coloridos pela métrica escolhida, mais o painel do bairro
  selecionado. Clicar fora dos círculos desfaz a seleção.
- *Gráfico geral e por bairro* — as chapas na cidade inteira nos dois turnos e
  a tabela ordenável dos 45 bairros.

As métricas mudam conforme a aba: vantagem, % de cada finalista, abstenção e
brancos/nulos nos turnos; deslocamento, deslocamento relativo à média da
cidade, votos ganhos e mudança no comparecimento na Diferença.

**Brasil** traz rankings nacionais por município, com filtro de UF e de mínimo
de votos válidos (padrão 1.000, porque o menor município do país tem 5 votos
válidos e meia dúzia de votos vira centenas por cento). **Entenda** é o
dicionário das medidas: cada verbete traz a conta e o valor que ela dá em
Araraquara.

No fim de qualquer aba, **Sobre os dados** detalha a procedência de cada
conjunto e as ressalvas de leitura.

## Decisões que valem explicar

**Voto a dois na aba Diferença.** Com onze chapas saindo da disputa, os dois
finalistas herdam votos e *ambos* sobem — no país, Lula ganhou votos em 98,4%
dos municípios e Flávio em 83,1%. Comparar o percentual sobre os válidos entre
turnos mede isso, não movimento político. O voto a dois (share de um sobre a
soma dos dois) não tem esse efeito mecânico.

**Pontos, não áreas pintadas.** O TSE publica a coordenada do local de votação.
Pintar polígonos de bairro sugeriria uma fronteira de voto que o dado não tem.

**Faixas compartilhadas entre os turnos.** Uma mesma medida usa os mesmos
cortes no 1º e no 2º turno, então a mudança de cor ao trocar de aba é mudança
de verdade, não de escala. O limite das escalas divergentes é o percentil 95 do
valor absoluto, para um local extremo não achatar todo o resto.

## Reproduzindo o pipeline

Baixe os conjuntos de <https://dadosabertos.tse.jus.br>. Os CSVs são
ISO-8859-1, separados por `;`, e grandes — o federal tem 1,58 GB
descompactado —, então vale filtrar o município direto do stream do zip.

```bash
node scripts/tse-01-mapear-secoes.mjs <caminho>/eleitorado_local_votacao_2026_SP.csv
```

```bash
node scripts/tse-03-agregar-votos.mjs <caminho>/votacao_secao_2026_BR.csv
```

```bash
node scripts/tse-07-municipios.mjs <caminho>/votacao_secao_2026_BR.csv
```

Os scripts `02`, `04`, `05` e `06` só conferem e não corrigem nada: validam os
locais contra a malha do IBGE, cruzam cadastro com apuração, inspecionam as
seções agregadas e comparam o enquadramento do mapa. Os totais fecham pelos
três caminhos — lista de seções, agregação por local e agregação por bairro.

## Estrutura

```
scripts/        pipeline do TSE (01 a 07) e o limite municipal do IBGE
src/
  dados/        seções mapeadas, apuração por bairro/local, contorno,
                municípios do país e o modelo com as métricas derivadas
  escalas.ts    escalas de cor      metricas.ts  métricas por visualização
  legenda.ts    linhas da legenda   tema.ts      tema claro/escuro
  componentes/
    grade.tsx          design system Grade, de design_guides/
    Mapa.tsx           os 67 locais sobre o mapa
    PainelBairro.tsx   detalhe do bairro e seus locais
    Totais.tsx         cartões da cidade e gráfico das chapas
    TabelaBairros.tsx  tabela ordenável dos 45 bairros
    Insights.tsx       rankings nacionais
    Entenda.tsx        dicionário das medidas
    SobreDados.tsx     procedência e ressalvas
  App.tsx       abas, sub-abas e layout
public/         municipios-brasil.json, carregado sob demanda
```

A interface segue o **Grade**, o design system em `design_guides/`.

## Publicação

O workflow `.github/workflows/pages.yml` publica no GitHub Pages a cada push no
`main`. Como é um site de projeto, servido em `/<repo>/`, o build lê `BASE_PATH`
— que o workflow preenche com o nome do repositório. `npm run build` local
continua na raiz.

## Ressalva de leitura

O bairro é o do **local de votação**, não o da residência do eleitor. Quem mora
no Jardim Indaiá pode votar numa escola do Centro, que sozinho concentra dez
locais e 22.286 eleitores. A página mostra com exatidão **onde cada voto foi
depositado**; não é um mapa de onde moram os eleitores de cada candidato.

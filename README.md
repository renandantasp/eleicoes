# Araraquara em dois turnos — eleição presidencial 2026

Aplicação React que compara a votação do 1º e do 2º turno da eleição
presidencial de 2026 por bairro de Araraquara/SP, com mapa interativo.

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
**todos os 45 bairros** se deslocaram no mesmo sentido, e 12 deles mudaram de
lado.

## Rodando

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. O mapa base vem do OpenStreetMap, então a
primeira carga precisa de internet.

## Interface: o design system Grade

A UI segue o **Grade**, o design system entregue em `design_guides/`, conforme
o roteiro do seu `IMPLEMENTACAO.md`.

| Onde | O que |
| --- | --- |
| `src/styles/grade/` | Cópia dos tokens e do `components.css`, com os `@import` ajustados |
| `src/styles/app.css` | Estilos do app sobre o sistema; só consome tokens `--ag-*` |
| `src/componentes/grade.tsx` | Os 14 componentes `ag-*` em TypeScript |
| `src/tema.ts` | Tema claro/escuro |
| `src/legenda.ts` | Monta as linhas da legenda a partir de uma métrica |

Mudanças de sistema vão em `design_guides/` e são recopiadas para
`src/styles/grade/`; ajustes do app ficam em `app.css`.

O que mudou de fato:

- **Tema claro e escuro**, com a escolha salva e um script inline no
  `index.html` que a aplica antes do primeiro render, para a página não piscar.
  As cores de dado são idênticas nos dois temas — só a cor de chapa usada como
  *texto* clareia no escuro.
- **Layout de três colunas** (`.ag-shell`): trilho de métricas de 220 px, mapa
  fluido e painel de 380 px *sticky*.
- **O gráfico de 45 barras saiu.** A barra da métrica ativa virou coluna da
  tabela (`InlineBar`), com a mesma cor de faixa do mapa. Isso removeu o
  Recharts: o bundle caiu de **886 KB para 521 KB** (255 → 150 KB comprimido).
- **A tabela ganhou a coluna "Locais"**, que diz quantos círculos formam cada
  bairro — o Centro tem dez.
- **`VoteSplit` fica sempre no painel**, mostrando a cidade quando não há
  bairro selecionado. O voto a dois passa a chegar pela forma antes do texto.
- **Procedência em dois lugares**: faixa escura *sticky* no topo e a fonte TSE
  de cada métrica no rodapé da legenda, que muda junto com a métrica.
- **Mapa**: círculos menores (3,5 a 17,5 px, eram 5 a 26), anéis por token,
  tiles dessaturados (invertidos no escuro) e onda de cor ao trocar de métrica,
  partindo do centro.
- **Tipografia** IBM Plex Sans e Mono, self-hosted via `@fontsource`.

### O que não mudou

A camada de dados ficou intacta: `src/dados/modelo.ts`,
`src/dados/municipios.ts`, os JSON e todos os `scripts/`. A adaptação foi só de
apresentação.

## Procedência

| Camada | Fonte | Campo |
| --- | --- | --- |
| Votos por seção | TSE, `votacao_secao_2026_BR` | `QT_VOTOS` por `NR_VOTAVEL` |
| Bairro de cada seção | TSE, `eleitorado_local_votacao_2026` | `NM_BAIRRO` |
| Endereço e coordenadas | idem | `DS_ENDERECO`, `NR_LATITUDE`, `NR_LONGITUDE` |
| Eleitorado por seção | idem | `QT_ELEITOR_SECAO` |
| Contorno do município | IBGE, malha municipal 2022 | código 3503208 |

O bairro **não é inferido**: vem preenchido pelo TSE. Sentinelas do TSE
(`#NULO#`, `#NE#`, `-1`, `-3`) são tratadas como ausência, nunca como valor.

Comparecimento = soma de todos os votos da seção (nominais + brancos + nulos).
Abstenção = eleitorado da seção menos comparecimento.

### Conferências que o pipeline faz

- Os 66 locais com coordenada publicada caem **todos** dentro da malha do IBGE.
- Totais de seções e eleitorado fecham pelos três caminhos: lista de seções,
  agregação por local e agregação por bairro.
- Votos válidos somados por bairro batem exatamente com os somados por local,
  nos dois turnos.

### Lacunas e detalhes da fonte

- **1 local sem coordenada**: a Penitenciária de Araraquara (1 seção,
  0 eleitores neste pleito). Não aparece no mapa; entra nas tabelas e totais.
- **2 seções do tipo "Agregada"** (52 eleitores) não recebem apuração própria —
  seus eleitores votam na seção principal. Nos dois casos a principal fica no
  mesmo local e no mesmo bairro, então o eleitorado por bairro conta o cadastro
  completo sem deslocar ninguém entre bairros.

### Onde está a apuração presidencial

No arquivo **`votacao_secao_2026_BR.zip`**, de abrangência federal. O arquivo
por UF (`votacao_secao_2026_SP.zip`) cobre a eleição *estadual* — governador,
senador e deputados — e **não contém o cargo de Presidente**. São duas eleições
distintas no cadastro do TSE:

- `cd_eleicao 6257` — Eleição Geral Federal 2026, 1º turno, 04/10/2026
- `cd_eleicao 6258` — Eleição Geral Federal 2026, 2º turno, 25/10/2026
- `cd_eleicao 6259` — Eleições Gerais Estaduais 2026, turno único, 04/10/2026

## Reproduzindo o pipeline

Baixe os dois conjuntos de <https://dadosabertos.tse.jus.br>:

```bash
node scripts/tse-01-mapear-secoes.mjs <caminho>/eleitorado_local_votacao_2026_SP.csv
```

```bash
node scripts/tse-02-validar.mjs
```

```bash
node scripts/tse-03-agregar-votos.mjs <caminho>/votacao_secao_2026_BR.csv
```

Os CSVs do TSE são ISO-8859-1 e separados por `;`. O arquivo BR tem 1,58 GB
descompactado e o SP 4,95 GB — vale filtrar as linhas do município direto do
stream do zip antes de processar.

Conferências extras:

```bash
node scripts/tse-04-conferir.mjs <caminho>/votacao_secao_2026_BR.csv
```

```bash
node scripts/tse-05-agregadas.mjs
```

## Estrutura

```
scripts/
  municipio_ibge.geojson     limite municipal do IBGE
  tse-01-mapear-secoes.mjs   seção -> local, endereço, bairro, CEP, coordenadas
  tse-02-validar.mjs         valida locais contra a malha do IBGE
  tse-03-agregar-votos.mjs   soma votos por seção, por local e por bairro
  tse-04-conferir.mjs        cruza cadastro x apuração
  tse-05-agregadas.mjs       inspeciona as seções agregadas
src/
  dados/
    secoes-araraquara.json   604 seções mapeadas (+ .csv equivalente)
    votacao-real.json        apuração por bairro e por local
    municipio.json           contorno do município
    modelo.ts                tipos, carregamento e métricas derivadas
  escalas.ts                 escalas de cor
  metricas.ts                métricas por visualização
  componentes/
    Mapa.tsx                 67 locais como círculos proporcionais
    Legenda.tsx              gradiente da métrica ativa
    PainelBairro.tsx         detalhe do bairro + seus locais
    ResumoMunicipio.tsx      cartões e gráfico por bairro
    TabelaBairros.tsx        tabela ordenável dos 45 bairros
    SobreDados.tsx           procedência e ressalvas
  App.tsx                    abas e layout
```

## As três visualizações

- **1º turno** — treze chapas. Métricas: vantagem, % de cada finalista,
  abstenção, brancos e nulos.
- **2º turno** — o confronto direto, mesmas métricas.
- **Diferença** — a métrica padrão é **"vs. média da cidade"**, porque *toda*
  Araraquara andou para o mesmo lado entre os turnos; é o desvio em relação à
  média que separa as áreas. Também há o deslocamento absoluto, votos ganhos
  por cada candidato e a mudança no comparecimento.

### Escalas de cor e legenda

As cores são **faixas discretas**, não degradê contínuo: dá para ler o valor
aproximado de uma área só pela cor.

**A legenda tem forma fixa.** Escala divergente ocupa sempre duas linhas de 5
células (uma por polo); escala sequencial, sempre uma linha de 5. Trocar de aba
ou de métrica muda os números dos cortes e as cores, nunca a disposição. A
unidade aparece uma vez, no cabeçalho, em vez de repetida nas dez células. Cada
célula traz quantos dos 45 bairros caem naquela faixa.

**Métricas iguais compartilham a escala entre os turnos.** "Vantagem", "%" de
cada candidato, abstenção e brancos+nulos usam exatamente os mesmos cortes no
1º e no 2º turno — a legenda não se mexe ao trocar de aba, e os dois mapas
ficam diretamente comparáveis. Os votos ganhos pelos dois candidatos também
dividem os mesmos cortes, invertendo só a cor, para que "ganhou votos" apareça
sempre na cor de quem ganhou.

Os cortes saem dos próprios dados, com três cuidados:

- **passo redondo ao mais próximo** (1, 2, 2,5, 5 ou 10 × potência de dez), para
  que os limites caiam em 5 pp, 100 votos etc. Como a quantidade de faixas é
  fixa, o passo precisa ficar perto de `limite/5`: arredondar para baixo deixaria
  a cobertura curta e jogaria a maioria das áreas na faixa aberta da ponta;
- **limite por percentil, não por máximo** — p95 do valor absoluto nas escalas
  divergentes, p2/p98 nas sequenciais. Um único local pequeno com resultado
  extremo esticaria o máximo e achataria o meio da distribuição; com percentil
  ele cai na faixa aberta da ponta;
- **unidades sem eleitorado ficam de fora do cálculo** — a Penitenciária tem 0
  eleitores, logo 0% em tudo, o que puxaria o início das faixas para zero sem
  significar nada.

As faixas das pontas são sempre abertas (`até X` / `X+`), então nenhum valor
fica sem cor. Faixas sem nenhum bairro nem local aparecem esmaecidas, o que
também informa: na aba de diferença, todo o lado negativo esmaecido mostra que
a cidade inteira andou para o mesmo lado.

### Cores por tipo de métrica

| Métrica | Paleta |
| --- | --- |
| Vantagem, deslocamento | vermelho ↔ azul (as cores das chapas) |
| % de cada candidato | tom único da cor daquele candidato |
| Votos ganhos | vermelho ↔ azul, invertido conforme o candidato |
| Abstenção, brancos e nulos | verde, tom único |
| Mudança no comparecimento | **âmbar ↔ verde-azulado** |

Comparecimento não tem lado partidário, então não usa o vermelho nem o azul
atribuídos aos candidatos — senão a cor sugeriria uma leitura política que o
dado não tem.

### Por que o mapa tem pontos e não áreas pintadas

Araraquara não publica polígonos oficiais de bairro, e o TSE publica pontos, não
fronteiras. Pintar áreas exigiria inventar limites. Os círculos estão nas
coordenadas exatas dos locais de votação, com área proporcional ao eleitorado.

### Por que a aba de diferença usa "voto a dois"

Do 1º para o 2º turno o número de chapas caiu de treze para duas, então os dois
finalistas sobem no percentual de válidos mesmo sem ganhar eleitor nenhum. O
voto a dois — share de cada um sobre a soma dos dois — remove esse efeito.

## Aba Insights — rankings nacionais por município

A quarta aba sai de Araraquara e usa os **5.715 municípios do país** (5.571 mais
144 localidades do exterior, que ficam de fora por padrão). Vem do mesmo
`votacao_secao_2026_BR`, agregado por município em vez de por seção.

Resultado nacional:

| | 1º turno | 2º turno |
| --- | --- | --- |
| Lula (13) | 53.879.536 — 45,16% | **64.256.232 — 51,79%** |
| Flávio Bolsonaro (22) | **56.104.503 — 47,03%** | 59.826.041 — 48,21% |

Mesmo padrão de Araraquara: Flávio lidera o 1º turno, Lula vence o 2º. O
deslocamento nacional no voto a dois é de **+2,8 pp** para Lula (Araraquara,
+2,8 pp também).

### O que a aba mostra

Três listas, cada uma com **todos os municípios do recorte** (5.565 no filtro
padrão), roláveis:

- uma por candidato, com alternância entre **percentual** e **absoluto**;
- uma com o deslocamento no voto a dois.

Cada lista tem um alternador de ordem (maiores ↔ menores). Como as listas são
completas, "maiores" e "menores" são a mesma lista invertida — por isso é um
botão, e não duas tabelas com o mesmo conteúdo espelhado.

**Araraquara fica destacada em violeta** em todas elas, com um botão que rola
até ela e mostra a posição no ranking atual. O violeta não é usado por nenhuma
métrica da aplicação, então o realce nunca se confunde com o valor da célula.
A cidade é a 104ª do país em ganho absoluto de votos para Flávio Bolsonaro, a
648ª em crescimento percentual, e a 2.352ª em deslocamento no voto a dois.

As listas são **virtualizadas**: só as ~25 linhas visíveis vão para o DOM, com
dois espaçadores sustentando a altura do resto. Renderizar as três listas
inteiras custava ~7 s e 134 mil nós; virtualizadas, 48 ms e 764 nós. A rolagem
e o conteúdo são os mesmos — a barra continua percorrendo os 5,5 mil
municípios.

> A altura da linha está fixada em 34 px no CSS (`.tabela--virtual tbody tr`) e
> repetida na constante `ALTURA_LINHA` do componente. Se uma mudar, a outra tem
> de mudar junto, senão a rolagem descola do conteúdo.

### Duas armadilhas tratadas na interface

**1. Quase todo mundo "cresce".** Com onze chapas saindo da disputa, os dois
finalistas herdam votos: Lula ganhou votos em **98,4%** dos municípios e Flávio
em **83,1%** — e em **4.732** deles os *dois* cresceram. Guaraní de Goiás e
Hidrolândia aparecem no topo do crescimento percentual dos **dois** candidatos
ao mesmo tempo, o que mostra bem o que essa métrica realmente mede: quantos
votos as chapas eliminadas tinham ali. Por isso há uma seção com o
deslocamento no voto a dois, que é a medida sem esse efeito.

**2. Percentual em cidade pequena engana.** O menor município do país tem 5
votos válidos e 62 têm menos de 200 — meia dúzia de votos vira centenas por
cento. Há um filtro de mínimo de votos válidos no 1º turno, visível e
ajustável, com padrão de 1.000. Também dá para filtrar por UF.

### Gerando os dados

```bash
node scripts/tse-07-municipios.mjs <caminho>/votacao_secao_2026_BR.csv
```

Sai em `public/municipios-brasil.json` (0,95 MB), carregado sob demanda quando
a aba abre — fora do bundle principal, que não deve carregar 5,7 mil municípios
para mostrar o mapa de Araraquara.

## Ressalva de leitura

O bairro é o do **local de votação**, não o da residência do eleitor. Quem mora
no Jardim Indaiá pode votar numa escola do Centro, que sozinho concentra dez
locais e 22.286 eleitores. A página mostra com exatidão **onde cada voto foi
depositado**; não é um mapa de onde moram os eleitores de cada candidato.

import type { ReactNode } from "react";

import { bairros, candidatos, fmtInt, locais, locaisSemCoordenada, meta, totais } from "../dados/modelo";
import { Tag } from "./grade";

function Item({
  kind,
  titulo,
  children,
}: {
  kind: "oficial" | "ressalva" | "apresentacao";
  titulo: string;
  children: ReactNode;
}) {
  const etiqueta = { oficial: "Oficial", ressalva: "Ressalva", apresentacao: "Apresentacao" }[kind];
  return (
    <div className="proveniencia">
      <Tag kind={kind}>{etiqueta}</Tag>
      <div>
        <h5>{titulo}</h5>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function SobreDados() {
  return (
    <section className="sobre" id="sobre-os-dados">
      <h3>Sobre os dados</h3>
      <p className="sobre__intro">
        Todos os numeros desta pagina vem do {meta.fonte.orgao}. Nenhum valor foi estimado,
        geocodificado ou interpolado. Abaixo, o que e dado oficial, o que e escolha de apresentacao
        e o que permanece como ressalva de leitura.
      </p>

      <div className="proveniencias">
        <Item kind="oficial" titulo="Apuracao">
          Votacao por secao eleitoral, conjunto <code>votacao_secao_2026_BR</code>, cargo Presidente.
          1o turno em {meta.datas.turno1} (eleicao 6257) e 2o turno em {meta.datas.turno2} (eleicao
          6258). Araraquara somou {fmtInt(totais.t1.validos)} votos validos no 1o turno e{" "}
          {fmtInt(totais.t2.validos)} no 2o, em {bairros.length} bairros e {locais.length} locais de
          votacao.
        </Item>

        <Item kind="oficial" titulo="Bairro de cada secao">
          Campo <code>NM_BAIRRO</code> do conjunto <code>eleitorado_local_votacao_2026</code>,
          preenchido pelo proprio TSE. Nao houve geocodificacao nem atribuicao por proximidade. As
          604 secoes do cadastro tem bairro e endereco informados; 602 receberam apuracao
          presidencial e as outras 2 sao do tipo &ldquo;Agregada&rdquo;, cujos eleitores votam na
          secao principal &mdash; que, nos dois casos, fica no mesmo local e no mesmo bairro.
        </Item>

        <Item kind="oficial" titulo="Eleitorado, comparecimento e abstencao">
          Eleitorado por secao do campo <code>QT_ELEITOR_SECAO</code>, somando{" "}
          {fmtInt(totais.eleitorado)} em Araraquara. O comparecimento e a soma de todos os votos da
          secao (nominais, brancos e nulos) e a abstencao e a diferenca entre os dois. Os totais
          fecham pelos tres caminhos: lista de secoes, agregacao por local e agregacao por bairro.
        </Item>

        <Item kind="oficial" titulo="Limite do municipio e coordenadas">
          Contorno do municipio: IBGE, malha municipal, codigo {meta.codigoIbge}. As coordenadas de
          cada local de votacao sao as que o TSE publica (<code>NR_LATITUDE</code>,{" "}
          <code>NR_LONGITUDE</code>) e todas caem dentro desse contorno.
          {locaisSemCoordenada.length > 0 && (
            <>
              {" "}
              {locaisSemCoordenada.length === 1 ? "Um local nao tem" : "Alguns locais nao tem"}{" "}
              coordenada publicada &mdash; {locaisSemCoordenada.map((l) => l.nome).join(", ")}{" "}
              &mdash; e por isso {locaisSemCoordenada.length === 1 ? "nao aparece" : "nao aparecem"}{" "}
              no mapa, embora {locaisSemCoordenada.length === 1 ? "entre" : "entrem"} normalmente nas
              tabelas e nos totais.
            </>
          )}
        </Item>

        <Item kind="apresentacao" titulo="Nomes curtos e cores">
          O TSE publica o nome civil completo de cada candidato. Para caber na interface, os rotulos
          foram encurtados e cada chapa recebeu uma cor. Isso nao altera nenhum numero. A
          correspondencia completa esta na tabela abaixo.
        </Item>
      </div>

      <div style={{ overflowX: "auto", marginTop: "var(--ag-space-06)" }}>
        <table className="ag-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "var(--ag-text-3)", fontSize: "var(--ag-fs-mono)", textAlign: "left" }}>
              <th style={{ padding: "6px 8px" }}>Numero</th>
              <th style={{ padding: "6px 8px" }}>Nome publicado pelo TSE</th>
              <th style={{ padding: "6px 8px" }}>Rotulo nesta pagina</th>
              <th className="num" style={{ padding: "6px 8px" }}>Votos 1o</th>
              <th className="num" style={{ padding: "6px 8px" }}>Votos 2o</th>
            </tr>
          </thead>
          <tbody>
            {candidatos.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid var(--ag-border)" }}>
                <td style={{ padding: "6px 8px" }}>
                  <i className="bolinha" style={{ background: c.cor, marginRight: 6 }} />
                  {c.numero}
                </td>
                <td style={{ padding: "6px 8px" }}>{c.nomeTse}</td>
                <td style={{ padding: "6px 8px" }}>{c.nome}</td>
                <td className="num" style={{ padding: "6px 8px" }}>{fmtInt(c.votos1)}</td>
                <td className="num" style={{ padding: "6px 8px" }}>
                  {c.votos2 > 0 ? fmtInt(c.votos2) : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="proveniencias" style={{ marginTop: "var(--ag-space-06)" }}>
        <Item kind="ressalva" titulo="O bairro e o do local de votacao">
          {meta.ressalva} O eleitor vota onde esta cadastrado, que nao e necessariamente onde mora
          hoje. Em bairros com escolas grandes &mdash; o Centro concentra dez locais &mdash; parte do
          eleitorado vem de outras partes da cidade. O que a pagina mostra com exatidao e onde cada
          voto foi depositado.
        </Item>

        <Item kind="ressalva" titulo="Por que o mapa tem pontos e nao areas pintadas">
          Araraquara nao publica os poligonos oficiais de bairro, e o TSE publica pontos, nao
          fronteiras. Pintar areas exigiria inventar limites. Os circulos estao nas coordenadas
          exatas dos locais de votacao, com area proporcional ao eleitorado de cada um.
        </Item>

        <Item kind="ressalva" titulo="Comparar os dois turnos pelo percentual de validos engana">
          Do 1o para o 2o turno o numero de chapas caiu de treze para duas, entao os dois finalistas
          sobem mecanicamente no percentual de validos, mesmo sem ganhar ninguem. Por isso o painel
          mostra sempre o voto a dois &mdash; o share de cada um sobre a soma dos dois.
        </Item>
      </div>

      <details>
        <summary>Como reproduzir</summary>
        <div>
          <p>Os dois conjuntos do TSE, em {meta.fonte.url}:</p>
          <ol>
            <li>
              <code>eleitorado_local_votacao_2026.zip</code> &rarr;{" "}
              <code>node scripts/tse-01-mapear-secoes.mjs &lt;csv_SP&gt;</code>, que gera o
              mapeamento secao &rarr; bairro;
            </li>
            <li>
              <code>node scripts/tse-02-validar.mjs</code>, que confere cada local contra a malha do
              IBGE;
            </li>
            <li>
              <code>votacao_secao_2026_BR.zip</code> &rarr;{" "}
              <code>node scripts/tse-03-agregar-votos.mjs &lt;csv&gt;</code>, que soma os votos por
              secao, por local e por bairro.
            </li>
          </ol>
          <p>
            A apuracao presidencial esta no arquivo <code>_BR</code>, de abrangencia federal, e nao
            no arquivo por UF: o <code>votacao_secao_2026_SP</code> cobre a eleicao estadual
            (governador, senador e deputados) e nao contem o cargo de Presidente.
          </p>
        </div>
      </details>

      <p className="sobre__rodape">
        {meta.pleito} &middot; {meta.municipioExibicao} &middot; extraido em {meta.extraidoEm}{" "}
        &middot; fonte: {meta.fonte.url}
      </p>
    </section>
  );
}

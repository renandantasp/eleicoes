import type { ReactNode } from "react";

import {
  bairros,
  candA,
  candB,
  fmtInt,
  fmtPct,
  fmtSinal,
  locais,
  meta,
  swingMunicipio,
  totais,
} from "../dados/modelo";
import { Callout, Tag } from "./grade";

/**
 * Aba de contexto: o que cada medida da pagina significa, com a conta que a
 * produz e o numero que ela da em Araraquara. Nada aqui e novo calculo - todos
 * os valores saem de dados/modelo.ts, as mesmas constantes que o mapa usa.
 */

function Verbete({
  termo,
  onde,
  conta,
  exemplo,
  children,
}: {
  termo: string;
  /** em que parte da pagina o termo aparece */
  onde: string;
  /** a conta, em palavras */
  conta: string;
  /** o valor que a conta da em Araraquara */
  exemplo?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="verbete">
      <div className="verbete__cab">
        <h4>{termo}</h4>
        <span className="verbete__onde">{onde}</span>
      </div>
      <p className="verbete__texto">{children}</p>
      <dl className="verbete__dados">
        <div>
          <dt>Conta</dt>
          <dd>{conta}</dd>
        </div>
        {exemplo && (
          <div>
            <dt>Em Araraquara</dt>
            <dd>{exemplo}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function Grupo({ titulo, nota, children }: { titulo: string; nota: string; children: ReactNode }) {
  return (
    <section className="entenda__grupo">
      <div className="entenda__grupo-cab">
        <h3>{titulo}</h3>
        <p>{nota}</p>
      </div>
      <div className="verbetes">{children}</div>
    </section>
  );
}

export function Entenda() {
  const maiorSwing = [...bairros].sort((a, b) => b.swingRelativo - a.swingRelativo)[0];
  const menorSwing = [...bairros].sort((a, b) => a.swingRelativo - b.swingRelativo)[0];
  const viraram = bairros.filter((b) => b.virou);

  return (
    <div className="entenda">
      <Callout>
        Esta aba nao tem dados novos: e o dicionario das medidas que aparecem no mapa, na legenda e
        nas tabelas. Cada verbete traz a conta exata e o valor que ela da em Araraquara, para que o
        numero na tela possa ser conferido contra a apuracao do {meta.fonte.orgao}.
      </Callout>

      <Grupo
        titulo="As unidades"
        nota="Tres niveis de agregacao aparecem na pagina, do menor para o maior."
      >
        <Verbete
          termo="Secao eleitoral"
          onde="nao aparece sozinha"
          conta="a menor unidade que o TSE publica"
          exemplo={`${fmtInt(locais.reduce((s, l) => s + l.qtdSecoes, 0))} secoes no cadastro`}
        >
          E a urna, com algumas centenas de eleitores. O TSE divulga o resultado nesse nivel. Esta
          pagina nunca mostra uma secao isolada: elas sao somadas no local de votacao &mdash;
          inclusive as poucas secoes agregadas, que nao recebem apuracao propria porque seus
          eleitores votam na secao principal do mesmo local.
        </Verbete>

        <Verbete
          termo="Local de votacao"
          onde="cada circulo do mapa"
          conta="soma das secoes do mesmo predio"
          exemplo={`${locais.length} locais`}
        >
          A escola ou o predio onde ficam as urnas. E a unidade com coordenada geografica, por isso
          e o que o mapa desenha. A area do circulo e proporcional ao eleitorado do local, nao ao
          resultado.
        </Verbete>

        <Verbete
          termo="Bairro"
          onde="painel lateral e tabela"
          conta="soma dos locais com o mesmo NM_BAIRRO"
          exemplo={`${bairros.length} bairros, ${fmtInt(totais.eleitorado)} eleitores`}
        >
          O bairro vem do campo que o TSE usa para descrever o endereco do local de votacao. Nao e
          um limite oficial de bairro da prefeitura, e sim o agrupamento dos locais que o TSE
          declara no mesmo bairro.
        </Verbete>
      </Grupo>

      <Grupo
        titulo="Quem votou"
        nota="Medidas de participacao. Nenhuma delas tem lado partidario."
      >
        <Verbete
          termo="Eleitorado"
          onde="cartao de totais, tamanho dos circulos"
          conta="eleitores aptos, inscritos na secao"
          exemplo={fmtInt(totais.eleitorado)}
        >
          Quantas pessoas podiam votar ali, tenham comparecido ou nao. E o denominador da abstencao
          e o que dimensiona os circulos do mapa.
        </Verbete>

        <Verbete
          termo="Comparecimento"
          onde="cartao de totais, metrica da aba Diferenca"
          conta="eleitorado menos abstencoes"
          exemplo={`${fmtInt(totais.t1.comparecimento)} no 1o turno, ${fmtInt(totais.t2.comparecimento)} no 2o`}
        >
          Quantas pessoas foram as urnas. Inclui quem votou em branco ou anulou: comparecer e
          diferente de escolher um candidato.
        </Verbete>

        <Verbete
          termo="Abstencao"
          onde="metrica do mapa, nas abas de turno"
          conta="abstencoes dividido pelo eleitorado"
          exemplo={`${fmtPct(totais.t1.abstencaoPct)} no 1o turno, ${fmtPct(totais.t2.abstencaoPct)} no 2o`}
        >
          A parcela do eleitorado que nao compareceu. Como o eleitorado e o mesmo nos dois turnos, a
          abstencao do 1o e a do 2o sao diretamente comparaveis.
        </Verbete>

        <Verbete
          termo="Votos validos"
          onde="denominador de quase tudo"
          conta="comparecimento menos brancos e nulos"
          exemplo={`${fmtInt(totais.t1.validos)} no 1o turno, ${fmtInt(totais.t2.validos)} no 2o`}
        >
          Os votos que foram para algum candidato. Todo percentual de chapa nesta pagina e sobre os
          validos, que e como o TSE apura o resultado.
        </Verbete>

        <Verbete
          termo="Brancos e nulos"
          onde="metrica do mapa, nas abas de turno"
          conta="brancos mais nulos, dividido pelo comparecimento"
          exemplo={`${fmtPct(totais.t1.brancoNuloPct)} no 1o turno, ${fmtPct(totais.t2.brancoNuloPct)} no 2o`}
        >
          Quem foi votar e nao escolheu ninguem. O denominador aqui e o comparecimento, nao o
          eleitorado: a medida responde &ldquo;entre os que foram, quantos nao escolheram&rdquo;.
        </Verbete>
      </Grupo>

      <Grupo
        titulo="Quem ganhou"
        nota="Medidas de resultado dentro de um turno. As duas primeiras sao as que o mapa pinta."
      >
        <Verbete
          termo="Vantagem"
          onde="metrica padrao do mapa, abas de turno"
          conta={`percentual de ${candA.nome} menos o de ${candB.nome}, sobre os validos`}
          exemplo={`${fmtSinal(totais.t1.vantagem)} pp no 1o turno, ${fmtSinal(totais.t2.vantagem)} pp no 2o`}
        >
          A distancia entre os dois finalistas. Positiva quando {candA.nome} esta a frente, negativa
          quando {candB.nome} esta. Zero e o empate, e e por isso que a escala dessa metrica e
          divergente: ela tem um centro com significado.
        </Verbete>

        <Verbete
          termo="pp (ponto percentual)"
          onde="legenda e tabela"
          conta="diferenca entre dois percentuais"
          exemplo={`de ${fmtPct(totais.t1.pctA)} para ${fmtPct(totais.t2.pctA)} e uma mudanca de ${fmtSinal(totais.t2.pctA - totais.t1.pctA)} pp`}
        >
          Ponto percentual nao e a mesma coisa que por cento. Sair de 40% para 44% e subir 4 pp, mas
          crescer 10%. Esta pagina usa sempre pp quando compara dois percentuais, para evitar essa
          ambiguidade.
        </Verbete>

        <Verbete
          termo="Voto a dois"
          onde="painel lateral e aba Diferenca"
          conta={`votos de um dividido pela soma dos dois finalistas`}
          exemplo={`${candA.nome} tem ${fmtPct(totais.t1.pctA2p, 2)} no 1o turno e ${fmtPct(totais.t2.pctA2p, 2)} no 2o`}
        >
          O resultado recalculado ignorando todas as outras chapas, como se a disputa sempre tivesse
          sido entre dois. E o unico jeito honesto de comparar um turno de treze candidatos com um
          turno de dois &mdash; e a base do deslocamento, logo abaixo.
        </Verbete>

        <Verbete
          termo="Mudou de lado"
          onde="cartao de totais da aba Diferenca"
          conta="bairro em que o mais votado do 1o turno nao venceu o 2o"
          exemplo={
            viraram.length
              ? `${viraram.length} de ${bairros.length}: ${viraram.map((b) => b.nome).join(", ")}`
              : `nenhum dos ${bairros.length} bairros`
          }
        >
          Compara apenas quem ficou em primeiro em cada turno, dentro do bairro. Um bairro pode
          deslocar-se bastante e nao mudar de lado, se a vantagem inicial era grande.
        </Verbete>
      </Grupo>

      <Grupo
        titulo="O que mudou entre os turnos"
        nota="As medidas da aba Diferenca. Sao as mais faceis de ler errado, por isso vem com a ressalva junto."
      >
        <Verbete
          termo="Deslocamento"
          onde="metrica da aba Diferenca"
          conta={`voto a dois de ${candA.nome} no 2o turno menos o do 1o turno`}
          exemplo={`${fmtPct(totais.t2.pctA2p, 2)} menos ${fmtPct(totais.t1.pctA2p, 2)} = ${fmtSinal(swingMunicipio.doisPartidos, 2)} pp na cidade`}
        >
          Para que lado a area andou entre os dois turnos, medido no voto a dois. Positivo e
          movimento para {candA.nome}; negativo, para {candB.nome}. Usa o voto a dois justamente
          para nao confundir movimento real com o efeito mecanico de onze chapas saindo da disputa.
        </Verbete>

        <Verbete
          termo="Vs. media da cidade"
          onde="metrica da aba Diferenca"
          conta="deslocamento do bairro menos o deslocamento do municipio"
          exemplo={`${maiorSwing.nome}: ${fmtSinal(maiorSwing.swingRelativo)} pp · ${menorSwing.nome}: ${fmtSinal(menorSwing.swingRelativo)} pp`}
        >
          O deslocamento descontado da mare geral. Como toda Araraquara andou para o mesmo lado, o
          deslocamento bruto pinta o mapa inteiro de uma cor so; esta medida e a que separa quem
          andou mais de quem andou menos.
        </Verbete>

        <Verbete
          termo="Votos ganhos"
          onde="metrica da aba Diferenca"
          conta="votos do candidato no 2o turno menos os do 1o"
          exemplo={`${candA.nome}: ${fmtSinal(swingMunicipio.deltaVotosA, 0)} · ${candB.nome}: ${fmtSinal(swingMunicipio.deltaVotosB, 0)}`}
        >
          Contagem absoluta, nao percentual. Os dois finalistas costumam subir ao mesmo tempo no 2o
          turno, porque herdam os votos das chapas eliminadas &mdash; subir sozinho nao significa ter
          vencido a disputa pelo deslocamento.
        </Verbete>

        <Verbete
          termo="Mudanca no comparecimento"
          onde="metrica da aba Diferenca"
          conta="comparecimento do 2o turno menos o do 1o"
          exemplo={`${fmtSinal(swingMunicipio.deltaComparecimento, 0)} eleitores na cidade`}
        >
          Quantas pessoas a mais, ou a menos, foram votar no 2o turno. Nao tem lado partidario, por
          isso e a unica metrica da aba que usa ambar e verde-azulado em vez das cores das chapas.
        </Verbete>
      </Grupo>

      <Grupo
        titulo="Como ler as cores"
        nota="A legenda abaixo do mapa muda de forma conforme o tipo da escala."
      >
        <Verbete
          termo="Escala divergente"
          onde="vantagem, deslocamento, votos ganhos"
          conta="faixas simetricas em torno de zero, com duas rampas de cor"
        >
          Usada quando o zero quer dizer alguma coisa &mdash; empate, ou nenhum movimento. Cada lado
          ganha a cor de um candidato, e a intensidade cresce com a distancia do centro.
        </Verbete>

        <Verbete
          termo="Escala sequencial"
          onde="abstencao, brancos e nulos, % de cada chapa"
          conta="faixas do menor ao maior valor, numa unica rampa"
        >
          Usada quando a medida so cresce, sem um centro natural. A amplitude vai do percentil 2 ao
          98 para que um local extremo nao achate todo o resto.
        </Verbete>

        <Verbete
          termo="Faixas compartilhadas"
          onde="todas as metricas de turno"
          conta="os cortes saem dos dois turnos somados"
        >
          Uma mesma medida usa os mesmos cortes no 1o e no 2o turno. Trocar de aba nao reorganiza a
          legenda, entao a mudanca de cor entre os turnos e mudanca de verdade, nao de escala.
        </Verbete>

        <Verbete
          termo="Limite robusto"
          onde="escalas divergentes"
          conta="percentil 95 do valor absoluto, nao o maximo"
        >
          A faixa mais extrema fecha no percentil 95, e nao no maior valor observado. Sem isso, um
          unico local atipico comprimiria todos os bairros em duas ou tres faixas.
        </Verbete>
      </Grupo>

      <div className="entenda__ressalvas">
        <h3>O que a pagina nao diz</h3>
        <div className="proveniencias">
          <div className="proveniencia">
            <Tag kind="ressalva">Ressalva</Tag>
            <div>
              <h5>Nenhuma medida aqui explica um porque</h5>
              <p>
                Saber que um bairro andou {fmtSinal(maiorSwing.swingRelativo)} pp acima da media diz
                o que aconteceu, nao a razao. A pagina nao cruza renda, escolaridade, idade ou
                qualquer outra variavel: nao ha nada nestes dados que sustente uma afirmacao sobre o
                perfil de quem votou.
              </p>
            </div>
          </div>
          <div className="proveniencia">
            <Tag kind="ressalva">Ressalva</Tag>
            <div>
              <h5>As ressalvas de leitura ficam logo abaixo</h5>
              <p>
                Por que o bairro e o do local de votacao e nao o da residencia, por que o mapa usa
                pontos em vez de areas pintadas e por que comparar os turnos pelo percentual de
                validos engana &mdash; os tres estao em &ldquo;Sobre os dados&rdquo;, no fim desta
                pagina, junto da proveniencia de cada conjunto.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

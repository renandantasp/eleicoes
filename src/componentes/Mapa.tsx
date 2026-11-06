import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { fmtInt, locaisGeolocalizados, municipio, type Local } from "../dados/modelo";
import { cssVar, raioPonto } from "../escalas";
import type { Metrica } from "../metricas";
import { Button, Segmented } from "./grade";

type Enquadramento = "urbano" | "municipio";

/** Limites de todos os locais de votacao. */
const LIMITES_LOCAIS = (() => {
  const b = L.latLngBounds([]);
  for (const l of locaisGeolocalizados) b.extend([l.latitude!, l.longitude!]);
  return b;
})();

/** Limites do municipio, a partir da malha do IBGE. */
const LIMITES_MUNICIPIO = (() => {
  const b = L.latLngBounds([]);
  for (const f of municipio.features) {
    const g = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
    const polis = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    for (const poli of polis) for (const anel of poli) for (const [lon, lat] of anel) b.extend([lat, lon]);
  }
  return b;
})();

/**
 * Enquadramento do nucleo urbano por uma regra tirada dos dados: os locais
 * mais proximos do centroide ponderado pelo eleitorado, ate cobrirem 95% dos
 * eleitores. Sem isso, meia duzia de locais rurais distantes espremem a cidade
 * inteira num canto do mapa.
 */
const FRACAO_NUCLEO = 0.95;

const CENTROIDE = (() => {
  const total = locaisGeolocalizados.reduce((s, l) => s + l.eleitorado, 0) || 1;
  return {
    lat: locaisGeolocalizados.reduce((s, l) => s + l.latitude! * l.eleitorado, 0) / total,
    lon: locaisGeolocalizados.reduce((s, l) => s + l.longitude! * l.eleitorado, 0) / total,
    total,
  };
})();

const FORA_DO_NUCLEO = (() => {
  const k = Math.cos((CENTROIDE.lat * Math.PI) / 180);
  const dist = (l: Local) =>
    ((l.latitude! - CENTROIDE.lat) ** 2 + ((l.longitude! - CENTROIDE.lon) * k) ** 2) ** 0.5;
  const ordenados = [...locaisGeolocalizados].sort((a, b) => dist(a) - dist(b));

  const caixa = L.latLngBounds([]);
  let acumulado = 0;
  let corte = ordenados.length;
  for (let i = 0; i < ordenados.length; i++) {
    const l = ordenados[i];
    caixa.extend([l.latitude!, l.longitude!]);
    acumulado += l.eleitorado;
    if (acumulado >= CENTROIDE.total * FRACAO_NUCLEO) {
      corte = i + 1;
      break;
    }
  }
  const fora = ordenados.slice(corte);
  return {
    limites: caixa.isValid() ? caixa : LIMITES_LOCAIS,
    quantidade: fora.length,
    eleitores: fora.reduce((s, l) => s + l.eleitorado, 0),
  };
})();

const LIMITES = { urbano: FORA_DO_NUCLEO.limites, municipio: LIMITES_MUNICIPIO };

const ELEITORADO_MAX = Math.max(...locaisGeolocalizados.map((l) => l.eleitorado), 1);

/** Fator de raio por enquadramento, conforme o design system. */
const FATOR = { urbano: 1, municipio: 0.5 };

function AjustaVista({ enquadramento, nonce }: { enquadramento: Enquadramento; nonce: number }) {
  const mapa = useMap();

  useEffect(() => {
    let cancelado = false;
    let quadro = 0;
    const aplicar = () => {
      if (cancelado) return;
      mapa.invalidateSize({ animate: false });
      const alvo = LIMITES[enquadramento];
      if (alvo.isValid()) mapa.fitBounds(alvo, { padding: [36, 36], animate: false });
    };
    quadro = requestAnimationFrame(() => {
      quadro = requestAnimationFrame(aplicar);
    });
    return () => {
      cancelado = true;
      cancelAnimationFrame(quadro);
    };
  }, [mapa, enquadramento, nonce]);

  useEffect(() => {
    const alvo = mapa.getContainer();
    const obs = new ResizeObserver(() => mapa.invalidateSize({ animate: false }));
    obs.observe(alvo);
    return () => obs.disconnect();
  }, [mapa]);

  return null;
}

/** Zoom pela roda so com Ctrl/Cmd, para nao sequestrar a rolagem da pagina. */
function ZoomComCtrl({ onDica }: { onDica: () => void }) {
  const mapa = useMap();
  useEffect(() => {
    const alvo = mapa.getContainer();
    const aoGirar = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        onDica();
        return;
      }
      e.preventDefault();
      const ponto = mapa.mouseEventToContainerPoint(e);
      const passo = e.deltaY > 0 ? -0.6 : 0.6;
      mapa.setZoomAround(mapa.containerPointToLatLng(ponto), mapa.getZoom() + passo);
    };
    alvo.addEventListener("wheel", aoGirar, { passive: false });
    return () => alvo.removeEventListener("wheel", aoGirar);
  }, [mapa, onDica]);
  return null;
}

/**
 * Onda de cor: ao trocar de metrica ou de turno, o atraso da transicao de cada
 * circulo cresce com a distancia ao centro, de modo que a mudanca varre o mapa
 * a partir do Centro em vez de piscar tudo de uma vez.
 */
function OndaDeCor({ chave }: { chave: string }) {
  const mapa = useMap();

  useEffect(() => {
    const centro = mapa.latLngToLayerPoint([CENTROIDE.lat, CENTROIDE.lon]);
    const passo = Number(
      getComputedStyle(document.documentElement).getPropertyValue("--ag-wave-step").replace("ms", ""),
    ) || 0;

    const caminhos: SVGPathElement[] = [];
    mapa.eachLayer((camada) => {
      const c = camada as L.CircleMarker & { _point?: L.Point };
      const el = typeof c.getElement === "function" ? (c.getElement() as SVGPathElement | null) : null;
      if (!el || !c._point) return;
      el.style.transitionDelay = `${Math.round(c._point.distanceTo(centro) * passo)}ms`;
      caminhos.push(el);
    });

    // depois da onda, zera o atraso para que o hover responda na hora
    const t = window.setTimeout(() => {
      for (const el of caminhos) el.style.transitionDelay = "0ms";
    }, 900);
    return () => window.clearTimeout(t);
  }, [mapa, chave]);

  return null;
}

interface Props {
  metrica: Metrica;
  bairroSelecionado: string | null;
  localDestacado: string | null;
  onSelecionarLocal: (local: Local) => void;
  onLimpar: () => void;
}

export function Mapa({
  metrica,
  bairroSelecionado,
  localDestacado,
  onSelecionarLocal,
  onLimpar,
}: Props) {
  const [enquadramento, setEnquadramento] = useState<Enquadramento>("urbano");
  const [nonce, setNonce] = useState(0);
  const [dicaZoom, setDicaZoom] = useState(false);
  const refDica = useRef<number | undefined>(undefined);

  function enquadrar(novo: Enquadramento) {
    setEnquadramento(novo);
    setNonce((n) => n + 1);
  }

  const mostrarDica = useCallback(() => {
    setDicaZoom(true);
    window.clearTimeout(refDica.current);
    refDica.current = window.setTimeout(() => setDicaZoom(false), 1400);
  }, []);

  useEffect(() => () => window.clearTimeout(refDica.current), []);

  // maiores primeiro, para os pequenos nao sumirem sob eles
  const ordenados = useMemo(
    () => [...locaisGeolocalizados].sort((a, b) => b.eleitorado - a.eleitorado),
    [],
  );

  const temSelecao = bairroSelecionado != null;
  const k = FATOR[enquadramento];

  const estiloMunicipio: L.PathOptions = {
    color: cssVar("--ag-map-outline"),
    weight: 1.25,
    fillOpacity: 0,
    dashArray: "4 4",
  };

  return (
    <div className="ag-map">
      <MapContainer
        style={{ height: "100%", width: "100%" }}
        bounds={FORA_DO_NUCLEO.limites}
        scrollWheelZoom={false}
        zoomControl
        attributionControl
        zoomSnap={0}
        zoomDelta={0.5}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='Mapa base &copy; OpenStreetMap &middot; limite: IBGE &middot; locais e votos: TSE'
          maxZoom={19}
        />
        <AjustaVista enquadramento={enquadramento} nonce={nonce} />
        <ZoomComCtrl onDica={mostrarDica} />
        <OndaDeCor chave={metrica.id} />

        <GeoJSON data={municipio} style={estiloMunicipio} interactive={false} />

        {ordenados.map((l) => {
          const doBairro = temSelecao && bairroSelecionado === l.bairroId;
          const esteLocal = localDestacado === l.id;
          const apagado = temSelecao && !doBairro;

          return (
            <CircleMarker
              key={l.id}
              center={[l.latitude!, l.longitude!]}
              radius={raioPonto(l.eleitorado, ELEITORADO_MAX, k)}
              pathOptions={{
                fillColor: cssVar(metrica.cor(metrica.valor(l))),
                fillOpacity: apagado ? 0.22 : 0.9,
                color: cssVar(doBairro ? "--ag-dot-ring-selected" : "--ag-dot-ring"),
                weight: esteLocal ? 3 : doBairro ? 2 : 1,
                opacity: apagado ? 0.35 : 1,
              }}
              eventHandlers={{ click: () => onSelecionarLocal(l) }}
            >
              <Tooltip sticky className="ag-tooltip" direction="right" offset={[10, 0]}>
                <span className="ag-tooltip__title">{l.nome}</span>
                <span className="ag-tooltip__value">{metrica.formato(metrica.valor(l))}</span>
                <span className="ag-tooltip__meta">
                  {l.bairro} &middot; {fmtInt(l.eleitorado)} eleitores &middot; {l.qtdSecoes} secoes
                </span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="ag-map__control mapa-topo-dir">
        <Segmented
          label="Enquadramento do mapa"
          value={enquadramento}
          onChange={enquadrar}
          options={[
            { id: "urbano", label: "Nucleo urbano" },
            { id: "municipio", label: "Municipio inteiro" },
          ]}
        />
        {enquadramento === "urbano" && FORA_DO_NUCLEO.quantidade > 0 && (
          <span className="mapa-nota">
            {FORA_DO_NUCLEO.quantidade} locais rurais fora do quadro &middot;{" "}
            {fmtInt(FORA_DO_NUCLEO.eleitores)} eleitores
          </span>
        )}
      </div>

      <div className="ag-map__control ag-scale-key mapa-baixo-esq">
        <span className="ag-scale-key__dots">
          <span style={{ width: 7, height: 7 }} />
          <span style={{ width: 14, height: 14 }} />
          <span style={{ width: 24, height: 24 }} />
        </span>
        area do circulo = eleitorado do local
      </div>

      {temSelecao && (
        <div className="ag-map__control mapa-baixo-dir">
          <Button onClick={onLimpar}>Limpar selecao &times;</Button>
        </div>
      )}

      <div className="ag-map__hint" data-visivel={dicaZoom} aria-hidden={!dicaZoom}>
        <span>
          Use <kbd>Ctrl</kbd> + roda para dar zoom
        </span>
      </div>
    </div>
  );
}

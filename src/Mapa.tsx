import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import mundo from "world-atlas/countries-110m.json";
import { intensidade } from "./formato";

const LARGURA = 1000;
const ALTURA = 500;
const ANTARTIDA = "010";

// Países pequenos demais para o contorno nesta escala viram ponto.
const PONTOS: Record<string, [number, number]> = {
  SG: [103.8, 1.35], HK: [114.2, 22.3], MT: [14.4, 35.9], MU: [57.5, -20.3], BB: [-59.5, 13.2],
  AD: [1.5, 42.5], WS: [-172, -13.7], BH: [50.5, 26], SJ: [16, 78], LU: [6.1, 49.8], CY: [33.3, 35.1],
};

const topologia = mundo as unknown as Topology<{ countries: GeometryCollection }>;
const colecao = feature(topologia, topologia.objects.countries) as FeatureCollection<Geometry>;
const contornos = colecao.features.filter((f) => String(f.id) !== ANTARTIDA);
const projecao = geoNaturalEarth1().fitSize([LARGURA, ALTURA], { type: "FeatureCollection", features: contornos });
const caminho = geoPath(projecao);
const desenhos = contornos.map((f: Feature<Geometry>) => ({ id: String(f.id), d: caminho(f) ?? "" }));

export interface PontoDoMapa {
  cc: string;
  num: string | null;
  nome: string;
  valor: number;
  texto: string;
}

interface Dica {
  ponto: PontoDoMapa;
  x: number;
  y: number;
}

export default function Mapa({ pontos, selecionado, aoSelecionar }: { pontos: PontoDoMapa[]; selecionado: string; aoSelecionar: (cc: string) => void }) {
  const [dica, setDica] = useState<Dica | null>(null);
  const valores = pontos.map((p) => p.valor);
  const maximo = Math.max(...valores, 1);
  const minimo = Math.min(...valores, maximo);
  const porNumero = useMemo(() => new Map(pontos.filter((p) => p.num).map((p) => [p.num as string, p])), [pontos]);

  const cor = (valor: number) => `color-mix(in srgb, var(--rosa) ${Math.round(intensidade(valor, maximo, minimo) * 100)}%, var(--mapa-baixo))`;
  const eventos = (ponto: PontoDoMapa) => ({
    onPointerMove: (ev: React.PointerEvent) => {
      const caixa = (ev.currentTarget as SVGElement).closest(".mapa")!.getBoundingClientRect();
      setDica({ ponto, x: ev.clientX - caixa.left, y: ev.clientY - caixa.top });
    },
    onPointerLeave: () => setDica(null),
    onClick: () => aoSelecionar(ponto.cc),
    className: ponto.cc === selecionado ? "selecionado" : undefined,
    style: { fill: cor(ponto.valor) },
  });

  return (
    <div className="mapa">
      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label="Mapa-múndi com as alegações por país. A tabela de países traz os mesmos números.">
        {desenhos.map(({ id, d }) => {
          const ponto = porNumero.get(id);
          return ponto ? <path key={id} d={d} {...eventos(ponto)} /> : <path key={id} d={d} className="sem-dado" />;
        })}
        {pontos.filter((p) => PONTOS[p.cc]).map((p) => {
          const xy = projecao(PONTOS[p.cc]);
          return xy ? <circle key={p.cc} cx={xy[0]} cy={xy[1]} r={5} {...eventos(p)} /> : null;
        })}
      </svg>
      {dica && (
        <div className="dica-flutuante" style={{ left: `min(${dica.x + 12}px, calc(100% - 13rem))`, top: Math.max(0, dica.y - 52) }}>
          <strong>{dica.ponto.nome}</strong>
          <div>{dica.ponto.texto}</div>
        </div>
      )}
    </div>
  );
}

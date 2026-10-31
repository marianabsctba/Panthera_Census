import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import mundo from "world-atlas/countries-110m.json";
import { intensidade, inteiro } from "./formato";
import type { Pais } from "./tipos";

const LARGURA = 1000;
const ALTURA = 500;
const ANTARTIDA = "010";

// Países pequenos demais para o contorno nesta escala viram ponto.
const PONTOS: Record<string, [number, number]> = {
  SG: [103.8, 1.35], HK: [114.2, 22.3], MT: [14.4, 35.9], MU: [57.5, -20.3], BB: [-59.5, 13.2],
  AD: [1.5, 42.5], WS: [-172, -13.7], BH: [50.5, 26], SJ: [16, 78],
};

const topologia = mundo as unknown as Topology<{ countries: GeometryCollection }>;
const colecao = feature(topologia, topologia.objects.countries) as FeatureCollection<Geometry>;
const contornos = colecao.features.filter((f) => String(f.id) !== ANTARTIDA);
const projecao = geoNaturalEarth1().fitSize([LARGURA, ALTURA], { type: "FeatureCollection", features: contornos });
const caminho = geoPath(projecao);
const desenhos = contornos.map((f: Feature<Geometry>) => ({ id: String(f.id), d: caminho(f) ?? "" }));

interface Dica {
  pais: Pais;
  x: number;
  y: number;
}

export function corDoPais(n: number, maximo: number) {
  const parte = Math.round(intensidade(n, maximo) * 100);
  return `color-mix(in srgb, var(--rosa) ${parte}%, var(--mapa-baixo))`;
}

export default function Mapa({ paises, selecionado, aoSelecionar }: { paises: Pais[]; selecionado: string; aoSelecionar: (cc: string) => void }) {
  const [dica, setDica] = useState<Dica | null>(null);
  const maximo = paises[0]?.n ?? 1;
  const porNumero = useMemo(() => new Map(paises.filter((p) => p.num).map((p) => [p.num as string, p])), [paises]);

  const mover = (pais: Pais) => (ev: React.PointerEvent) => {
    const caixa = (ev.currentTarget as SVGElement).closest(".mapa")!.getBoundingClientRect();
    setDica({ pais, x: ev.clientX - caixa.left, y: ev.clientY - caixa.top });
  };
  const eventos = (pais: Pais) => ({
    onPointerMove: mover(pais),
    onPointerLeave: () => setDica(null),
    onClick: () => aoSelecionar(pais.cc),
    className: pais.cc === selecionado ? "selecionado" : undefined,
    style: { fill: corDoPais(pais.n, maximo) },
  });

  return (
    <div className="mapa">
      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label="Mapa-múndi com as alegações por país. A tabela de países traz os mesmos números.">
        {desenhos.map(({ id, d }) => {
          const pais = porNumero.get(id);
          return pais ? <path key={id} d={d} {...eventos(pais)} /> : <path key={id} d={d} className="sem-dado" />;
        })}
        {paises.filter((p) => PONTOS[p.cc]).map((p) => {
          const xy = projecao(PONTOS[p.cc]);
          return xy ? <circle key={p.cc} cx={xy[0]} cy={xy[1]} r={5} {...eventos(p)} /> : null;
        })}
      </svg>
      {dica && (
        <div className="dica-flutuante" style={{ left: `min(${dica.x + 12}px, calc(100% - 11rem))`, top: Math.max(0, dica.y - 52) }}>
          <strong>{dica.pais.nome}</strong>
          <div>{inteiro(dica.pais.n)} alegações</div>
        </div>
      )}
    </div>
  );
}

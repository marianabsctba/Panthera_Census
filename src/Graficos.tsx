import { useEffect, useRef, useState } from "react";
import { inteiro, marcasDoEixo, porcento } from "./formato";
import type { Contagem, LinhaSetor } from "./tipos";

function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(640);
  useEffect(() => {
    if (!ref.current) return;
    const observador = new ResizeObserver(([e]) => setLargura(Math.max(260, e.contentRect.width)));
    observador.observe(ref.current);
    return () => observador.disconnect();
  }, []);
  return [ref, largura] as const;
}

export function Barras({ linhas }: { linhas: Contagem[] }) {
  const maior = Math.max(1, ...linhas.map(([, n]) => n));
  // A soma dos recortes pequenos fecha a lista, não importa o tamanho dela.
  const ordem = [...linhas].sort((a, b) => Number(a[0] === "Outros recortes") - Number(b[0] === "Outros recortes"));
  return (
    <div className="barras">
      {ordem.map(([rotulo, n]) => (
        <div className="barra" key={rotulo}>
          <span className="barra-rotulo">{rotulo}</span>
          <span className="barra-trilha"><span className="barra-valor" style={{ width: `${(n * 100) / maior}%` }} /></span>
          <span className="barra-numero">{inteiro(n)}</span>
        </div>
      ))}
    </div>
  );
}

interface Coluna {
  rotulo: string;
  valor: number;
  destaque?: number | null;
  dica: string;
}

export function Colunas({ colunas, cor, descricao, cadaQuantos = 1 }: { colunas: Coluna[]; cor: string; descricao: string; cadaQuantos?: number }) {
  const [ref, W] = useLargura<HTMLDivElement>();
  const [ativa, setAtiva] = useState<{ c: Coluna; x: number; y: number } | null>(null);
  const H = 200;
  const m = { t: 8, r: 6, b: 24, l: 44 };
  const marcas = marcasDoEixo(Math.max(1, ...colunas.map((c) => c.valor)));
  const topo = marcas.at(-1) ?? 1;
  const y = (v: number) => H - m.b - (v / topo) * (H - m.t - m.b);
  const passo = (W - m.l - m.r) / colunas.length;
  const larg = Math.max(2, Math.min(40, passo * 0.78));
  const salto = W < 460 ? cadaQuantos * 2 : cadaQuantos;
  return (
    <div className="grafico" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={descricao}>
        {marcas.map((t) => (
          <g key={t}>
            <line className="grade" x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} />
            <text x={m.l - 6} y={y(t) + 4} textAnchor="end">{inteiro(t)}</text>
          </g>
        ))}
        {colunas.map((c, i) => {
          const x = m.l + i * passo + (passo - larg) / 2;
          return (
            <g key={c.rotulo}>
              <rect x={x} y={y(c.valor)} width={larg} height={y(0) - y(c.valor)} rx={Math.min(3, larg / 2)} style={{ fill: cor }} />
              {c.destaque != null && <rect x={x} y={y(c.destaque)} width={larg} height={y(0) - y(c.destaque)} rx={Math.min(3, larg / 2)} className="destaque" />}
              <rect x={m.l + i * passo} y={m.t} width={passo} height={H - m.t - m.b} fill="transparent"
                onPointerMove={() => setAtiva({ c, x: x + larg / 2, y: y(c.valor) })} onPointerLeave={() => setAtiva(null)} />
              {i % salto === 0 && <text x={x + larg / 2} y={H - 7} textAnchor="middle">{c.rotulo}</text>}
            </g>
          );
        })}
      </svg>
      {ativa && (
        <div className="dica-flutuante" style={{ left: `min(${ativa.x + 8}px, calc(100% - 13rem))`, top: Math.max(0, ativa.y - 46) }}>
          <strong>{ativa.c.rotulo}</strong>
          <div>{ativa.c.dica}</div>
        </div>
      )}
    </div>
  );
}

export function Setores({ linhas }: { linhas: LinhaSetor[] }) {
  const [ref, W] = useLargura<HTMLDivElement>();
  const [ativa, setAtiva] = useState<{ l: LinhaSetor; y: number } | null>(null);
  const alt = 30;
  const m = { t: 6, r: 16, b: 24, l: W < 480 ? 124 : 176 };
  const H = m.t + m.b + linhas.length * alt;
  const maximo = Math.max(1, ...linhas.flatMap((l) => [l.margem[1], l.fonte, l.mundo ?? 0]));
  const marcas = marcasDoEixo(maximo, W < 480 ? 3 : 5);
  const topo = marcas.at(-1) ?? 1;
  const x = (v: number) => m.l + (v / topo) * (W - m.l - m.r);
  return (
    <div className="grafico" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Parte de cada setor nas alegações: Brasil revisado, Brasil como veio da fonte e mundo.">
        {marcas.map((t) => (
          <g key={t}>
            <line className="grade" x1={x(t)} x2={x(t)} y1={m.t} y2={H - m.b} />
            <text x={x(t)} y={H - 7} textAnchor="middle">{t}%</text>
          </g>
        ))}
        {linhas.map((l, i) => {
          const y = m.t + i * alt + alt / 2;
          return (
            <g key={l.setor} onPointerMove={() => setAtiva({ l, y })} onPointerLeave={() => setAtiva(null)}>
              <rect x={0} y={y - alt / 2} width={W} height={alt} fill="transparent" />
              <text x={m.l - 10} y={y + 4} textAnchor="end" className={l.setor === "Agro e alimentos" ? "forte" : undefined}>{l.setor}</text>
              <line className="margem" x1={x(l.margem[0])} x2={x(l.margem[1])} y1={y} y2={y} />
              {l.mundo != null && <circle className="ponto-mundo" cx={x(l.mundo)} cy={y} r={4.5} />}
              {l.mundo != null && <circle className="ponto-fonte" cx={x(l.fonte)} cy={y} r={4.5} />}
              <circle className="ponto-revisado" cx={x(l.revisado)} cy={y} r={5} />
            </g>
          );
        })}
      </svg>
      {ativa && (
        <div className="dica-flutuante" style={{ right: 8, top: Math.max(0, ativa.y + 12) }}>
          <strong>{ativa.l.setor}</strong>
          <div>Brasil revisado: {porcento(ativa.l.revisado)} ({porcento(ativa.l.margem[0])} a {porcento(ativa.l.margem[1])})</div>
          {ativa.l.mundo != null ? (
            <>
              <div>Brasil na fonte: {porcento(ativa.l.fonte)}</div>
              <div>Mundo na fonte: {porcento(ativa.l.mundo)}</div>
            </>
          ) : <div>Categoria criada na revisão, sem comparação</div>}
        </div>
      )}
    </div>
  );
}

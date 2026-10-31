import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Barras, Colunas } from "./Graficos";
import { data, inteiro, nomeDoMes } from "./formato";
import type { Grupo, Resumo } from "./tipos";

function Endereco({ valor }: { valor: string }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    navigator.clipboard?.writeText(valor).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    }).catch(() => undefined);
  };
  return (
    <div className="endereco">
      <code>{valor}</code>
      <button className="aba" onClick={copiar}>{copiado ? "Copiado" : "Copiar"}</button>
    </div>
  );
}

function Perfil({ g, verificado }: { g: Grupo; verificado: string | null }) {
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, string[]>();
    for (const [categoria, nome] of g.ferramentas) mapa.set(categoria, [...(mapa.get(categoria) ?? []), nome]);
    return [...mapa.entries()];
  }, [g]);
  return (
    <div className="perfil">
      <div className="pais">{g.nome}</div>
      <div className="selos">
        {g.raas && <span className="selo">Modelo RaaS</span>}
        {g.apreendido && <span className="selo">Site apreendido</span>}
        {g.sinalizado && <span className="selo selo-alerta">A fonte avisa: pouco confiável</span>}
        {g.outroNome && <span className="selo selo-neutro">Também conhecido como {g.outroNome}</span>}
        {g.linhagem && <span className="selo selo-neutro">Linhagem: {g.linhagem}</span>}
      </div>
      <div className="numeros compactos">
        <div className="numero"><strong>{inteiro(g.total)}</strong><span>alegações desde o começo</span></div>
        <div className="numero"><strong>{inteiro(g.dozeMeses)}</strong><span>em 12 meses</span></div>
        <div className="numero"><strong>{inteiro(g.noBrasil)}</strong><span>no Brasil</span></div>
        <div className="numero"><strong>{inteiro(g.sitesNoAr)} de {inteiro(g.sites)}</strong><span>sites no ar</span></div>
      </div>
      <p className="nota">Primeira alegação em {nomeDoMes(g.primeira)}, última em {nomeDoMes(g.ultima)}.</p>
      <div className="pesquisar">
        <h3>Para pesquisar este grupo</h3>
        <div className="etiquetas">
          <a className="link-pesquisa" href={`https://www.ransomware.live/group/${encodeURIComponent(g.nome)}`} target="_blank" rel="noopener noreferrer">Ficha no Ransomware.live <ArrowUpRight size={14} /></a>
          {g.nomeRansomLook && <a className="link-pesquisa" href={`https://www.ransomlook.io/group/${encodeURIComponent(g.nomeRansomLook)}`} target="_blank" rel="noopener noreferrer">Ficha no RansomLook <ArrowUpRight size={14} /></a>}
          {g.referencias.map((url) => <a key={url} className="link-pesquisa" href={url} target="_blank" rel="noopener noreferrer">Relatório: {new URL(url).hostname.replace(/^www\./, "")} <ArrowUpRight size={14} /></a>)}
        </div>
        {g.enderecos.length > 0 && (
          <>
            <h3>Site de vazamento no ar</h3>
            <div className="enderecos">
              {g.enderecos.map((e) => <Endereco key={e} valor={e} />)}
            </div>
            {verificado && <p className="nota">Verificado pelo <a href="https://www.ransomlook.io" target="_blank" rel="noopener noreferrer">RansomLook</a> (CC BY 4.0) e atualizado aqui em {data(verificado)}. Esses endereços mudam com frequência.</p>}
          </>
        )}
        <p className="aviso">Sites de grupos são operados por criminosos e podem ter dados roubados, inclusive de saúde e de crianças. Só para pesquisa legítima: acesse em ambiente isolado, não baixe nada e não contate o grupo. Abrir ou guardar dados roubados pode ter consequências legais. Os endereços ficam sem link de propósito, para ninguém cair lá por um clique.</p>
        <p className="nota">As fichas são de terceiros e listam os endereços do grupo e as vítimas alegadas.</p>
      </div>
      <div className="duas">
        <div><h3>Setores mais citados</h3><Barras linhas={g.setores} /></div>
        <div><h3>Países mais citados</h3><Barras linhas={g.paises} /></div>
      </div>
      {g.anos.length > 1 && (
        <>
          <h3>Alegações por ano</h3>
          <Colunas cor="var(--rosa)" descricao={`Alegações do grupo ${g.nome} por ano.`}
            colunas={g.anos.map(([ano, n]) => ({ rotulo: ano, valor: n, dica: `${inteiro(n)} alegações` }))} />
        </>
      )}
      {porCategoria.length > 0 && (
        <>
          <h3>Ferramentas já vistas em ataques ({inteiro(g.ferramentas.length)})</h3>
          <div className="etiquetas-blocos">
            {porCategoria.map(([categoria, nomes]) => (
              <div key={categoria}>
                <span className="nota">{categoria}</span>
                <div className="etiquetas">{nomes.map((n) => <span key={n} className="etiqueta">{n}</span>)}</div>
              </div>
            ))}
          </div>
        </>
      )}
      {g.vulnerabilidades.length > 0 && (
        <>
          <h3>Vulnerabilidades já exploradas ({inteiro(g.vulnerabilidades.length)})</h3>
          <div className="etiquetas">
            {g.vulnerabilidades.map(([cve, produto]) => <span key={cve + produto} className="etiqueta" title={produto}>{cve} ({produto})</span>)}
          </div>
        </>
      )}
      {porCategoria.length === 0 && g.vulnerabilidades.length === 0 && (
        <p className="nota">Ainda não há ferramentas ou vulnerabilidades mapeadas para este grupo.</p>
      )}
    </div>
  );
}

export default function Grupos({ grupos, resumo }: { grupos: Grupo[]; resumo: Resumo }) {
  const [busca, setBusca] = useState("");
  const [nome, setNome] = useState(grupos[0]?.nome ?? "");
  const termo = busca.trim().toLowerCase();
  const lista = grupos.filter((g) => !termo || g.nome.toLowerCase().includes(termo) || (g.outroNome ?? "").toLowerCase().includes(termo));
  const atual = grupos.find((g) => g.nome === nome) ?? grupos[0];
  const t = resumo.tipos;
  const e = resumo.ecossistema;
  return (
    <section id="grupos" className="secao">
      <h2 className="titulo-secao">Os grupos</h2>
      <div className="numeros">
        <div className="cartao numero"><strong>{inteiro(t.total)}</strong><span>grupos acompanhados</span></div>
        <div className="cartao numero"><strong>{inteiro(t.comSiteNoAr)}</strong><span>com site no ar agora</span></div>
        <div className="cartao numero"><strong>{inteiro(t.raas)}</strong><span>marcados como RaaS, que alugam o ransomware a afiliados</span></div>
        <div className="cartao numero"><strong>{inteiro(t.comLinhagem)}</strong><span>com linhagem conhecida, derivados de outro grupo</span></div>
        <div className="cartao numero"><strong>{inteiro(t.sinalizados)}</strong><span>com aviso da fonte de que parecem pouco confiáveis</span></div>
      </div>
      <div className="duas">
        <div className="cartao">
          <h3>Grupos novos por ano</h3>
          <p className="nota">Ano da primeira alegação de cada grupo.</p>
          <Colunas cor="var(--rosa)" descricao="Grupos novos por ano." colunas={resumo.gruposNovos.filter(([a]) => a >= "2019").map(([ano, n]) => ({ rotulo: ano, valor: n, dica: `${inteiro(n)} grupos novos` }))} />
        </div>
        {e && (
          <div className="cartao">
            <h3>O tamanho do submundo</h3>
            <p className="nota">Contagem de outra fonte, o <a href="https://www.ransomlook.io" target="_blank" rel="noreferrer">RansomLook</a>, que usa critérios próprios.</p>
            <div className="numeros compactos">
              <div className="numero"><strong>{inteiro(e.grupos)}</strong><span>grupos, {inteiro(e.gruposNoAr)} no ar</span></div>
              <div className="numero"><strong>{inteiro(e.sitesDeVazamento)}</strong><span>endereços de sites de vazamento</span></div>
              <div className="numero"><strong>{inteiro(e.mercados)}</strong><span>mercados, {inteiro(e.mercadosNoAr)} no ar</span></div>
              <div className="numero"><strong>{inteiro(e.publicacoes90d)}</strong><span>publicações em 90 dias</span></div>
            </div>
          </div>
        )}
      </div>
      <div className="cartao">
        <h3>Perfil de cada grupo</h3>
        <p className="nota">{inteiro(grupos.length)} grupos com 3 alegações ou mais, do mais ao menos ativo. Escolha um para ver o perfil.</p>
        <div className="grupos-linha">
          <div className="grupos-lista">
            <label className="sr" htmlFor="busca-grupo">Buscar grupo</label>
            <input id="busca-grupo" className="campo" type="search" placeholder="Buscar grupo" value={busca} onChange={(ev) => setBusca(ev.target.value)} />
            <div className="grupos-rolagem">
              {lista.map((g) => (
                <button key={g.nome} className={`grupo-botao${g.nome === atual?.nome ? " ativo" : ""}`} onClick={() => setNome(g.nome)}>
                  <span>{g.nome}{g.sinalizado ? " ⚠" : ""}</span><span className="barra-numero">{inteiro(g.total)}</span>
                </button>
              ))}
              {lista.length === 0 && <p className="nota">Nenhum grupo com esse nome.</p>}
            </div>
          </div>
          {atual && <Perfil g={atual} verificado={resumo.enderecosVerificados} />}
        </div>
      </div>
    </section>
  );
}

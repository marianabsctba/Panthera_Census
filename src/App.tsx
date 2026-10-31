import { useEffect, useMemo, useRef, useState } from "react";
import { Github, Loader2, Moon, Sun } from "lucide-react";
import PainelAnpd from "./Anpd";
import { Barras, Colunas, Setores } from "./Graficos";
import Grupos from "./Grupos";
import { data, inteiro, nomeDoMes, parteDe, umaCasa } from "./formato";
import Mapa, { type PontoDoMapa } from "./Mapa";
import Secao, { irPara } from "./Secao";
import type { Grupo, Pais, Periodo, Resumo } from "./tipos";

const preferencia = (chave: string) => {
  try { return localStorage.getItem(chave); } catch { return null; }
};
const gravar = (chave: string, valor: string) => {
  try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento, só não lembra */ }
};

const baixar = <T,>(arquivo: string): Promise<T> =>
  fetch(`./dados/${arquivo}`).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<T>;
  });

const Fonte = () => <a href="https://www.ransomware.live" target="_blank" rel="noreferrer">Ransomware.live</a>;

type Medida = "n" | "porMilhao" | "porPib";
const MEDIDAS: Record<Medida, { rotulo: string; unidade: string }> = {
  n: { rotulo: "Alegações", unidade: "alegações" },
  porMilhao: { rotulo: "Por milhão de habitantes", unidade: "por milhão de habitantes" },
  porPib: { rotulo: "Por US$ 100 bi de PIB", unidade: "por US$ 100 bi de PIB" },
};

const NAV = [["mapa", "Mapa"], ["brasil", "Brasil"], ["tempo", "Tempo"], ["alegam", "O que alegam"], ["grupos", "Grupos"], ["ataque", "Como atacam"], ["anpd", "ANPD"], ["ler", "Como ler"]] as const;

function valorDe(p: Pais, medida: Medida, setor: Map<string, number> | null): number | null {
  const n = setor ? setor.get(p.cc) ?? 0 : p.n;
  if (n === 0) return null;
  if (medida === "n") return n;
  const taxa = p[medida];
  return taxa == null ? null : Math.round(((taxa * n) / p.n) * 100) / 100;
}
const mostrar = (valor: number, medida: Medida) => (medida === "n" ? inteiro(valor) : umaCasa(valor));

function SecaoMapa({ p, aberto }: { p: Periodo; aberto: string }) {
  const [selecionado, setSelecionado] = useState("BR");
  const [medida, setMedida] = useState<Medida>("n");
  const [setor, setSetor] = useState("");
  const secao = useRef<HTMLElement>(null);

  const porSetor = useMemo(() => (setor ? new Map(p.mapaSetor[setor] ?? []) : null), [p, setor]);
  const linhas = useMemo(
    () => p.paises
      .map((pais) => ({ pais, valor: valorDe(pais, medida, porSetor) }))
      .filter((l): l is { pais: Pais; valor: number } => l.valor != null)
      .sort((a, b) => b.valor - a.valor || a.pais.nome.localeCompare(b.pais.nome)),
    [p, medida, porSetor],
  );
  const pontos: PontoDoMapa[] = linhas.map(({ pais, valor }) => ({ cc: pais.cc, num: pais.num, nome: pais.nome, valor, texto: `${mostrar(valor, medida)} ${MEDIDAS[medida].unidade}` }));
  const pais = p.paises.find((x) => x.cc === selecionado) ?? p.paises[0];
  const lugarBr = linhas.findIndex((l) => l.pais.cc === "BR") + 1;
  const setores = Object.keys(p.mapaSetor).sort((a, b) => a.localeCompare(b));
  const cobertura = p.comPais / Math.max(1, p.alegacoes);

  return (
    <section id="mapa" className="secao" ref={secao}>
      <div className="linha-mapa">
        <div className="cartao">
          <h2>Onde as alegações caem</h2>
          <div className="filtros">
            <label>Medir por
              <select className="campo" value={medida} onChange={(e) => setMedida(e.target.value as Medida)}>
                {(Object.keys(MEDIDAS) as Medida[]).map((m) => <option key={m} value={m}>{MEDIDAS[m].rotulo}</option>)}
              </select>
            </label>
            <label>Setor
              <select className="campo" value={setor} onChange={(e) => setSetor(e.target.value)}>
                <option value="">Todos os setores</option>
                {setores.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <p className="nota">
            {lugarBr > 0 ? <>Por essa medida, o Brasil fica em <strong>{lugarBr}º</strong> entre {inteiro(linhas.length)} países. </> : "O Brasil não aparece neste recorte. "}
            Clique em um país para ver o detalhe.
          </p>
          {cobertura < 0.85 && <p className="aviso">Neste período, a fonte só indica o país em {parteDe(p.comPais, p.alegacoes)} das alegações. O mapa está incompleto.</p>}
          <Mapa pontos={pontos} selecionado={pais.cc} aoSelecionar={setSelecionado} />
          <div className="legenda">
            <span>menor</span><span className="rampa" /><span>maior</span>
            <span className="amostra" /><span>menos de 3 casos, sem registro ou fora da conta</span>
          </div>
          <p className="nota">Escala logarítmica. Países pequenos demais para o contorno aparecem como ponto. Nas contas por habitante e por PIB, países com menos de 1 milhão de habitantes ficam de fora. População e PIB: <a href="https://data.worldbank.org" target="_blank" rel="noreferrer">Banco Mundial</a>.</p>
        </div>
        <div className="cartao detalhe">
          <label className="escolher-pais">Escolher país
            <select className="campo" value={pais.cc} onChange={(e) => setSelecionado(e.target.value)}>
              {[...p.paises].sort((a, b) => a.nome.localeCompare(b.nome)).map((x) => <option key={x.cc} value={x.cc}>{x.nome}</option>)}
            </select>
          </label>
          <div className="pais">{pais.nome}</div>
          <p className="nota">
            {inteiro(pais.n)} alegações
            {pais.porMilhao != null && <>, {umaCasa(pais.porMilhao)} por milhão de habitantes</>}
            {pais.porPib != null && <>, {umaCasa(pais.porPib)} por US$ 100 bi de PIB</>}
          </p>
          <h3>Setores</h3>
          <Barras linhas={pais.setores} />
          <h3>Grupos</h3>
          <Barras linhas={pais.grupos} />
          <h3>Por trimestre</h3>
          <Barras linhas={pais.trimestres} />
          <p className="nota">Recortes com menos de 3 casos são somados ou omitidos.</p>
        </div>
      </div>
      <div className="cartao">
        <h3>Todos os países visíveis{setor ? `: ${setor}` : ""}</h3>
        <p className="nota">{inteiro(p.paisesVisiveis)} de {inteiro(p.paisesCitados)} países têm 3 casos ou mais {aberto}. Clique em uma linha para abrir o detalhe.</p>
        <div className="tabela">
          <table>
            <thead><tr><th scope="col">País</th><th scope="col">Alegações</th><th scope="col">Por milhão</th><th scope="col">Por US$ 100 bi</th></tr></thead>
            <tbody>
              {linhas.map(({ pais: x }) => (
                <tr key={x.cc} className={x.cc === pais.cc ? "selecionado" : undefined}>
                  <td><button className="linha-pais" onClick={() => { setSelecionado(x.cc); secao.current?.scrollIntoView({ behavior: "smooth" }); }}>{x.nome}</button></td>
                  <td>{inteiro(porSetor ? porSetor.get(x.cc) ?? 0 : x.n)}</td>
                  <td>{x.porMilhao != null ? umaCasa(valorDe(x, "porMilhao", porSetor) ?? 0) : "fora da conta"}</td>
                  <td>{x.porPib != null ? umaCasa(valorDe(x, "porPib", porSetor) ?? 0) : "fora da conta"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function SecaoBrasil({ p, doPeriodo }: { p: Periodo; doPeriodo: string }) {
  const b = p.brasil;
  return (
    <Secao id="brasil" titulo="O Brasil se parece com o mundo?">
      <div className="cartao">
        <p className="nota">Parte de cada setor nas alegações {doPeriodo}. A linha mostra a incerteza do número revisado, com intervalo de 95%. Só o Brasil passou pela revisão, então diferenças pequenas ainda não dizem muita coisa.</p>
        <div className="chave">
          <span><i className="c-revisado" />Brasil revisado</span>
          <span><i className="c-fonte" />Brasil como veio da fonte</span>
          <span><i className="c-mundo" />Mundo como veio da fonte</span>
        </div>
        <Setores linhas={p.setores} />
        <p className="nota">Construção, Imobiliário e Mídia só existem na nossa revisão, porque a fonte não tem essas categorias.</p>
      </div>
      <div className="duas">
        <div className="cartao">
          <h3>Grupos mais ativos no Brasil</h3>
          <Barras linhas={p.grupos.brasil} />
          <h3>Grupos mais ativos no mundo</h3>
          <Barras linhas={p.grupos.mundo} />
        </div>
        <div className="cartao">
          <h3>O que a revisão encontrou</h3>
          <p className="nota">Leitura caso a caso dos marcados como Brasil na fonte, ainda sem segunda checagem. Só os últimos 12 meses foram lidos até agora.</p>
          <div className="numeros compactos">
            <div className="numero"><strong>{inteiro(b.fonte)}</strong><span>marcados como Brasil na fonte</span></div>
            <div className="numero"><strong>{inteiro(b.estrangeiros)}</strong><span>eram de outro país</span></div>
            <div className="numero"><strong>{inteiro(b.duplicatas)}</strong><span>eram repetições</span></div>
            <div className="numero"><strong>{inteiro(b.setoresCorrigidos)}</strong><span>mudaram de setor</span></div>
            <div className="numero"><strong>{inteiro(b.pendentes)}</strong><span>ainda esperam revisão</span></div>
          </div>
        </div>
      </div>
    </Secao>
  );
}

function SecaoTempo({ p, r }: { p: Periodo; r: Resumo }) {
  return (
    <Secao id="tempo" titulo="No tempo">
      <div className="duas">
        <div className="cartao">
          <h3>Mundo, mês a mês</h3>
          <p className="nota">Alegações publicadas por mês, desde janeiro de 2021.</p>
          <Colunas cor="var(--rosa)" cadaQuantos={12} descricao="Alegações por mês no mundo."
            colunas={r.meses.map((m) => ({ rotulo: nomeDoMes(m.mes), valor: m.mundo, dica: `${inteiro(m.mundo)} alegações` }))} />
        </div>
        <div className="cartao">
          <h3>Brasil, mês a mês</h3>
          <p className="nota">Como marcado na fonte, em escala própria. Antes de 2024, a fonte costuma não indicar o país.</p>
          <Colunas cor="var(--rosa)" cadaQuantos={12} descricao="Alegações por mês no Brasil, como marcado na fonte."
            colunas={r.meses.map((m) => ({ rotulo: nomeDoMes(m.mes), valor: m.brasil, dica: `${inteiro(m.brasil)} alegações` }))} />
        </div>
        <div className="cartao">
          <h3>Quanto demora até aparecer</h3>
          <p className="nota">Tempo entre a data estimada da publicação ou do ataque e o registro da alegação pela fonte.</p>
          <Barras linhas={p.tempo.atraso} />
        </div>
        <div className="cartao">
          <h3>Dia da semana</h3>
          <p className="nota">Dia em que a alegação foi registrada, não o dia do ataque. Criminoso também folga, um pouco.</p>
          <Barras linhas={p.tempo.semana} />
        </div>
      </div>
    </Secao>
  );
}

function SecaoAlegam({ p }: { p: Periodo }) {
  const t = p.textos;
  const fatia = (n: number) => `${inteiro(n)} casos, ${parteDe(n, p.alegacoes)} das alegações do período`;
  return (
    <Secao id="alegam" titulo="O que eles alegam">
      <p className="aviso">Isto é o que o próprio criminoso escreve, e criminoso conta vantagem. Cada gráfico vale só para os poucos casos em que a informação aparece e não representa todas as vítimas. Textos gerados por IA pela fonte ficam de fora.</p>
      <div className="duas">
        <div className="cartao"><h3>Volume de dados alegado</h3><p className="nota">{fatia(t.volume.n)}.</p><Barras linhas={t.volume.faixas} /></div>
        <div className="cartao"><h3>Faturamento da vítima</h3><p className="nota">{fatia(t.faturamento.n)}.</p><Barras linhas={t.faturamento.faixas} /></div>
        <div className="cartao"><h3>Funcionários da vítima</h3><p className="nota">{fatia(t.funcionarios.n)}.</p><Barras linhas={t.funcionarios.faixas} /></div>
        <div className="cartao"><h3>Situação citada</h3><p className="nota">{fatia(t.situacao.n)}. {inteiro(t.comPrazo)} casos citam um prazo.</p><Barras linhas={t.situacao.faixas} /></div>
      </div>
      <div className="cartao">
        <h3>Tipos de dado citados</h3>
        <p className="nota">Busca por palavras em {inteiro(t.comTexto)} textos. Uma alegação pode citar vários tipos, e a busca é aproximada.</p>
        <Barras linhas={t.dados} />
      </div>
    </Secao>
  );
}

function SecaoAtaque({ r }: { r: Resumo }) {
  return (
    <Secao id="ataque" titulo="Como atacam">
      <p className="dica">
        O que relatórios públicos já viram em ataques: {inteiro(r.totaisMatrizes.ferramentas)} ferramentas e {inteiro(r.totaisMatrizes.vulnerabilidades)} vulnerabilidades. Fonte: <a href="https://github.com/BushidoUK/Ransomware-Tool-Matrix" target="_blank" rel="noreferrer">Ransomware Tool Matrix</a> e <a href="https://github.com/BushidoUK/Ransomware-Vulnerability-Matrix" target="_blank" rel="noreferrer">Ransomware Vulnerability Matrix</a>, de BushidoUK (CC BY 4.0).
      </p>
      <div className="duas">
        <div className="cartao">
          <h3>Ferramentas usadas por mais grupos</h3>
          <p className="nota">Se você detecta estas, já complica a vida de muita gente mal-intencionada.</p>
          <Barras linhas={r.ferramentas.map((f) => [`${f.nome} (${f.categoria})`, f.grupos])} />
        </div>
        <div className="cartao">
          <h3>Vulnerabilidades usadas por mais grupos</h3>
          <p className="nota">Número de grupos com uso relatado.</p>
          <Barras linhas={r.vulnerabilidades.map((v) => [`${v.cve} (${v.produto})`, v.grupos])} />
        </div>
      </div>
    </Secao>
  );
}

function Conteudo({ r, grupos }: { r: Resumo; grupos: Grupo[] }) {
  const [chave, setChave] = useState("12m");
  const [periodos, setPeriodos] = useState<Record<string, Periodo>>({});
  const [falhou, setFalhou] = useState(false);
  const p = periodos[chave];

  useEffect(() => {
    if (periodos[chave]) return;
    setFalhou(false);
    baixar<Periodo>(`periodo-${chave}.json`).then((d) => setPeriodos((a) => ({ ...a, [chave]: d }))).catch(() => setFalhou(true));
  }, [chave, periodos]);

  const rotulo = chave === "12m" ? "nos últimos 12 meses" : chave === "tudo" ? "desde 2013" : `em ${chave}`;
  const doPeriodo = chave === "12m" ? "dos últimos 12 meses" : chave === "tudo" ? "desde 2013" : `de ${chave}`;

  return (
    <>
      <section className="abertura">
        <h1>Os criminosos contam vantagem. A gente conta direito.</h1>
        <p className="dica">
          Tudo aqui é alegação de criminoso em site de vazamento, não incidente confirmado. Nenhuma vítima é identificada. Dados até {data(r.periodo.fim)}. Fonte: <Fonte />.
        </p>
      </section>

      <nav className="navegacao" aria-label="Seções">
        <label className="periodo">Período
          <select className="campo" value={chave} onChange={(e) => setChave(e.target.value)}>
            <option value="12m">Últimos 12 meses</option>
            {r.anosDisponiveis.map((a) => <option key={a} value={a}>{a}</option>)}
            <option value="tudo">Desde o começo (2013)</option>
          </select>
        </label>
        <div className="atalhos">
          {NAV.map(([id, nome]) => (
            <a key={id} href={`#${id}`} onClick={(ev) => { ev.preventDefault(); irPara(id); }}>{nome}</a>
          ))}
        </div>
      </nav>

      {!p ? (
        <p className="estado">
          {falhou ? "Não foi possível carregar este período. Tente outro ou recarregue a página." : <><Loader2 className="girando" size={20} /> Contando as alegações…</>}
        </p>
      ) : (
        <>
          <p className="grande">
            {rotulo[0].toUpperCase() + rotulo.slice(1)}, grupos de ransomware publicaram <strong>{inteiro(p.alegacoes)}</strong> alegações. {p.brasil.posicao > 0 && <>O Brasil aparece em <strong>{p.brasil.posicao}º</strong> lugar em número de alegações, com <strong>{inteiro(p.brasil.final)}</strong> casos{p.brasil.pendentes > 5 ? ", com a revisão ainda parcial neste período" : " depois da nossa revisão"}.</>}
          </p>
          <section className="numeros" aria-label="Números principais">
            <div className="cartao numero"><strong>{inteiro(p.paisesCitados)}</strong><span>países citados {rotulo}</span></div>
            <div className="cartao numero"><strong>{inteiro(p.gruposAtivos)}</strong><span>grupos ativos {rotulo}</span></div>
            <div className="cartao numero"><strong>{inteiro(r.total)}</strong><span>alegações na base, desde 2013</span></div>
            <div className="cartao numero"><strong>{inteiro(p.brasil.fonte)}</strong><span>casos marcados como Brasil na fonte, antes da revisão</span></div>
          </section>
          <SecaoMapa p={p} aberto={rotulo} />
          <SecaoBrasil p={p} doPeriodo={doPeriodo} />
          <SecaoTempo p={p} r={r} />
          <SecaoAlegam p={p} />
        </>
      )}

      <Grupos grupos={grupos} resumo={r} />
      <SecaoAtaque r={r} />
      <PainelAnpd a={r.anpd} />

      <Secao id="ler" titulo="Como ler">
        <ul className="lista">
          <li>Quem paga o resgate tende a não aparecer em site de vazamento, então a base mostra só uma parte dos ataques.</li>
          <li>País e setor vêm da fonte e têm erros. Na leitura dos casos do Brasil, cerca de 8% eram de outro país e 18% estavam no setor errado. Quando a informação falta, fica como não informado.</li>
          <li>O site mostra apenas números somados. Nomes, sites e links de vítimas ficam fora dele e do repositório.</li>
          <li>Grupos são citados pelo nome porque são os autores das alegações. Para pesquisa, o site lista os endereços de anúncio, chat e painel dos grupos, no ar ou não. Servidores de arquivos, contatos e carteiras ficam de fora.</li>
          <li>Países com mais empresas aparecem mais. Por isso, o mapa também mede por habitante e por PIB.</li>
        </ul>
      </Secao>
    </>
  );
}

export default function App() {
  const [tema, setTema] = useState<"claro" | "escuro">(() => {
    const t = preferencia("census:tema");
    if (t === "claro" || t === "escuro") return t;
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "claro" : "escuro";
  });
  const [dados, setDados] = useState<{ resumo: Resumo; grupos: Grupo[] } | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", tema === "claro" ? "#ffffff" : "#0b0b0b");
    gravar("census:tema", tema);
  }, [tema]);

  useEffect(() => {
    Promise.all([baixar<Resumo>("resumo.json"), baixar<Grupo[]>("grupos.json")])
      .then(([resumo, grupos]) => setDados({ resumo, grupos }))
      .catch(() => setFalhou(true));
  }, []);

  return (
    <div className="app">
      <header className="topo">
        <a className="marca" href="./">
          <img src="./pantera.webp" alt="" />
          <span className="nome">PANTHERA CENSUS</span>
        </a>
        <button className="tema" aria-label={tema === "claro" ? "Usar fundo escuro" : "Usar fundo claro"} title={tema === "claro" ? "Fundo escuro" : "Fundo claro"}
          onClick={() => setTema(tema === "claro" ? "escuro" : "claro")}>
          {tema === "claro" ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>
      <main className="conteudo">
        {dados ? <Conteudo r={dados.resumo} grupos={dados.grupos} /> : falhou ? (
          <p className="estado">Não foi possível carregar os números de hoje. Recarregue a página em alguns minutos.</p>
        ) : (
          <p className="estado"><Loader2 className="girando" size={20} /> Contando as alegações…</p>
        )}
      </main>
      <footer className="rodape">
        <span>Source: <Fonte /></span>
        <span>Ferramentas e CVEs: BushidoUK. Endereços e totais do submundo: RansomLook. Oficial: ANPD. População e PIB: Banco Mundial.</span>
        <a href="https://github.com/marianabsctba/Panthera_Census/issues" target="_blank" rel="noreferrer">Pedir correção ou remoção</a>
        <a href="https://github.com/marianabsctba/Panthera_Census" target="_blank" rel="noreferrer"><Github size={16} /> Código aberto</a>
      </footer>
    </div>
  );
}

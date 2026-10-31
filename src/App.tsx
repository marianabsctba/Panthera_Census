import { useEffect, useRef, useState } from "react";
import { Github, Loader2, Moon, Sun } from "lucide-react";
import { Barras, Colunas, Setores } from "./Graficos";
import { data, inteiro, nomeDoMes } from "./formato";
import Mapa from "./Mapa";
import type { Census } from "./tipos";

const preferencia = (chave: string) => {
  try { return localStorage.getItem(chave); } catch { return null; }
};
const gravar = (chave: string, valor: string) => {
  try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento, só não lembra */ }
};

const Fonte = () => <a href="https://www.ransomware.live" target="_blank" rel="noreferrer">Ransomware.live</a>;

function Conteudo({ c }: { c: Census }) {
  const [selecionado, setSelecionado] = useState("BR");
  const mapa = useRef<HTMLElement>(null);
  const pais = c.paises.find((p) => p.cc === selecionado) ?? c.paises[0];
  const { brasil: b, doze: d } = c;
  const revisado = b.revisados > 0;

  return (
    <>
      <section className="abertura">
        <h1>Os criminosos contam vantagem. A gente conta direito.</h1>
        <p className="grande">
          Em 12 meses, grupos de ransomware publicaram <strong>{inteiro(d.alegacoes)}</strong> alegações. O Brasil aparece em <strong>{b.posicao}º</strong> lugar entre os países, com <strong>{inteiro(b.final)}</strong> casos{revisado ? " depois da nossa revisão" : ""}.
        </p>
        <p className="dica">
          Tudo aqui é alegação de criminoso em site de vazamento, não incidente confirmado. Nenhuma vítima é identificada. Período: {data(c.periodo.inicio)} a {data(c.periodo.fim)}. Fonte: <Fonte />.
        </p>
      </section>

      <section className="numeros" aria-label="Números principais">
        <div className="cartao numero"><strong>{inteiro(d.paises)}</strong><span>países citados em 12 meses</span></div>
        <div className="cartao numero"><strong>{inteiro(d.grupos)}</strong><span>grupos ativos em 12 meses</span></div>
        <div className="cartao numero"><strong>{inteiro(c.total)}</strong><span>alegações na base, desde 2013</span></div>
        <div className="cartao numero"><strong>{inteiro(b.fonte)}</strong><span>casos marcados como Brasil na fonte, antes da revisão</span></div>
      </section>

      <section className="linha-mapa" ref={mapa}>
        <div className="cartao">
          <h2>Onde as alegações caem</h2>
          <p className="nota">Alegações por país nos últimos 12 meses. Clique em um país para ver o detalhe.</p>
          <Mapa paises={c.paises} selecionado={pais.cc} aoSelecionar={setSelecionado} />
          <div className="legenda">
            <span>3</span><span className="rampa" /><span>{inteiro(c.paises[0].n)}</span>
            <span className="amostra" /><span>menos de 3 ou sem registro</span>
          </div>
          <p className="nota">Escala logarítmica. Países pequenos demais para o contorno aparecem como ponto. A posição reflete também o que chega aos sites de vazamento, não só o risco de cada país.</p>
        </div>
        <div className="cartao detalhe">
          <div className="pais">{pais.nome}</div>
          <p className="nota">{inteiro(pais.n)} alegações em 12 meses</p>
          <h3>Setores</h3>
          <Barras linhas={pais.setores} />
          <h3>Grupos</h3>
          <Barras linhas={pais.grupos} />
          <h3>Por trimestre</h3>
          <Barras linhas={pais.trimestres} />
          <p className="nota">Recortes com menos de 3 casos são somados ou omitidos.</p>
        </div>
      </section>

      <section className="cartao">
        <h2>Todos os países visíveis</h2>
        <p className="nota">{inteiro(d.paisesVisiveis)} de {inteiro(d.paises)} países têm 3 casos ou mais. Clique em uma linha para abrir o detalhe.</p>
        <div className="tabela">
          <table>
            <thead><tr><th scope="col">País</th><th scope="col">Alegações</th></tr></thead>
            <tbody>
              {c.paises.map((p) => (
                <tr key={p.cc} className={p.cc === pais.cc ? "selecionado" : undefined}>
                  <td><button className="linha-pais" onClick={() => { setSelecionado(p.cc); mapa.current?.scrollIntoView({ behavior: "smooth" }); }}>{p.nome}</button></td>
                  <td>{inteiro(p.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="duas">
        <div className="cartao">
          <h2>Mundo, mês a mês</h2>
          <p className="nota">Alegações publicadas por mês, desde janeiro de 2024.</p>
          <Colunas cor="var(--rosa)" cadaQuantos={6} descricao="Alegações por mês no mundo."
            colunas={c.meses.map((m) => ({ rotulo: nomeDoMes(m.mes), valor: m.mundo, dica: `${inteiro(m.mundo)} alegações` }))} />
        </div>
        <div className="cartao">
          <h2>Brasil, mês a mês</h2>
          <p className="nota">Mesmo período, como marcado na fonte, em escala própria.</p>
          <Colunas cor="var(--rosa)" cadaQuantos={6} descricao="Alegações por mês no Brasil, como marcado na fonte."
            colunas={c.meses.map((m) => ({ rotulo: nomeDoMes(m.mes), valor: m.brasil, dica: `${inteiro(m.brasil)} alegações` }))} />
        </div>
      </section>

      <section className="cartao">
        <h2>O Brasil se parece com o mundo?</h2>
        <p className="nota">Parte de cada setor nas alegações de 12 meses. A linha mostra a incerteza do número revisado, com intervalo de 95%. Só o Brasil passou pela revisão, então diferenças pequenas ainda não dizem muita coisa.</p>
        <div className="chave">
          <span><i className="c-revisado" />Brasil revisado</span>
          <span><i className="c-fonte" />Brasil como veio da fonte</span>
          <span><i className="c-mundo" />Mundo como veio da fonte</span>
        </div>
        <Setores linhas={c.setores} />
        <p className="nota">Construção, Imobiliário e Mídia só existem na nossa revisão, porque a fonte não tem essas categorias.</p>
      </section>

      <section className="duas">
        <div className="cartao">
          <h2>Grupos mais ativos no mundo</h2>
          <p className="nota">Alegações em 12 meses.</p>
          <Barras linhas={c.grupos.mundo} />
        </div>
        <div className="cartao">
          <h2>Grupos mais ativos no Brasil</h2>
          <p className="nota">Alegações em 12 meses{revisado ? ", depois da revisão" : ""}.</p>
          <Barras linhas={c.grupos.brasil} />
        </div>
      </section>

      <section className="duas">
        <div className="cartao">
          <h2>O que chega à ANPD</h2>
          <p className="nota">Comunicações de incidente recebidas por ano, de todos os tipos. Em rosa, as de ransomware nos anos em que conseguimos ler esse número. O último ano ainda está em andamento.</p>
          <Colunas cor="var(--neutro)" descricao="Comunicações de incidente à ANPD por ano."
            colunas={c.anpd.anos.map((a) => ({
              rotulo: a.ano, valor: a.incidentes, destaque: a.ransomware,
              dica: `${inteiro(a.incidentes)} comunicações${a.ransomware != null ? `, ${inteiro(a.ransomware)} de ransomware` : ""}`,
            }))} />
          <p className="nota">Dado oficial, transcrito à mão em {data(c.anpd.atualizado)} dos <a href="https://www.gov.br/anpd/pt-br/assuntos/incidente-de-seguranca" target="_blank" rel="noreferrer">painéis da ANPD</a>. Nunca é somado às alegações: mede outra coisa, e só cobre incidentes com dados pessoais e risco relevante.</p>
        </div>
        <div className="cartao">
          <h2>O que a revisão encontrou no Brasil</h2>
          <p className="nota">Leitura caso a caso dos marcados como Brasil na fonte, ainda sem segunda checagem.</p>
          <div className="numeros compactos">
            <div className="numero"><strong>{inteiro(b.estrangeiros)}</strong><span>eram de outro país</span></div>
            <div className="numero"><strong>{inteiro(b.duplicatas)}</strong><span>eram repetições</span></div>
            <div className="numero"><strong>{inteiro(b.setoresCorrigidos)}</strong><span>mudaram de setor</span></div>
            <div className="numero"><strong>{inteiro(b.pendentes)}</strong><span>ainda esperam revisão</span></div>
          </div>
          <p className="nota">Os números dos outros países seguem como vieram da fonte.</p>
        </div>
      </section>

      <section className="cartao">
        <h2>Como ler</h2>
        <ul className="lista">
          <li>Quem paga o resgate tende a não aparecer em site de vazamento, então a base mostra só uma parte dos ataques.</li>
          <li>País e setor vêm da fonte e têm erros. Quando a informação falta, fica como não informado.</li>
          <li>O site mostra apenas números somados. Nomes, sites e links de vítimas ficam fora dele e do repositório.</li>
          <li>Grupos são citados pelo nome porque são os autores das alegações.</li>
        </ul>
      </section>
    </>
  );
}

export default function App() {
  const [tema, setTema] = useState<"claro" | "escuro">(() => {
    const t = preferencia("census:tema");
    if (t === "claro" || t === "escuro") return t;
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "claro" : "escuro";
  });
  const [census, setCensus] = useState<Census | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", tema === "claro" ? "#ffffff" : "#0b0b0b");
    gravar("census:tema", tema);
  }, [tema]);

  useEffect(() => {
    fetch("./dados/census.json")
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(setCensus)
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
        {census ? <Conteudo c={census} /> : falhou ? (
          <p className="estado">Não foi possível carregar os números de hoje. Recarregue a página em alguns minutos.</p>
        ) : (
          <p className="estado"><Loader2 className="girando" size={20} /> Contando as alegações…</p>
        )}
      </main>
      <footer className="rodape">
        <span>Source: <Fonte /></span>
        <span>Atribuições de grupos e categorias são da fonte, salvo a revisão do Brasil.</span>
        <a href="https://github.com/marianabsctba/Panthera_Census/issues" target="_blank" rel="noreferrer">Pedir correção ou remoção</a>
        <a href="https://github.com/marianabsctba/Panthera_Census" target="_blank" rel="noreferrer"><Github size={16} /> Código aberto</a>
      </footer>
    </div>
  );
}

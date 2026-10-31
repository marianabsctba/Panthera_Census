import { useState } from "react";
import { Barras, Colunas } from "./Graficos";
import { data, inteiro, parteDe } from "./formato";
import type { Anpd, RecorteAnpd } from "./tipos";

const VISOES = { segmentos: "Segmento", estados: "Estado", setores: "Setor" } as const;
type Visao = keyof typeof VISOES;

function Tabela({ linhas, rotulo }: { linhas: RecorteAnpd[]; rotulo: string }) {
  return (
    <div className="tabela">
      <table>
        <thead>
          <tr><th scope="col">{rotulo}</th><th scope="col">Comunicações</th><th scope="col">Ransomware</th><th scope="col">Parte</th><th scope="col">Com dados levados</th><th scope="col">Sem dados levados</th></tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.nome}>
              <td>{l.nome}</td><td>{inteiro(l.total)}</td><td>{inteiro(l.ransomware)}</td><td>{parteDe(l.ransomware, l.total)}</td><td>{inteiro(l.comTransferencia)}</td><td>{inteiro(l.semTransferencia)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PainelAnpd({ a }: { a: Anpd }) {
  const [visao, setVisao] = useState<Visao>("segmentos");
  const linhas = [...a[visao]].sort((x, y) => y.ransomware - x.ransomware || y.total - x.total);
  return (
    <section id="anpd" className="secao">
      <h2 className="titulo-secao">O que chega à ANPD</h2>
      <p className="dica">
        Dado oficial, transcrito em {data(a.atualizado)} dos <a href="https://www.gov.br/anpd/pt-br/assuntos/incidente-de-seguranca" target="_blank" rel="noreferrer">painéis da ANPD</a>. Nunca é somado às alegações: mede outra coisa, e só cobre incidentes com dados pessoais e risco relevante. A conta inclui comunicações preliminares, complementares e completas, e ainda falta confirmar se uma mesma ocorrência conta mais de uma vez.
      </p>
      <div className="numeros">
        <div className="cartao numero"><strong>{inteiro(a.total)}</strong><span>comunicações desde 2021</span></div>
        <div className="cartao numero"><strong>{inteiro(a.ransomware)}</strong><span>de ransomware ({parteDe(a.ransomware, a.total)})</span></div>
      </div>
      <div className="duas">
        <div className="cartao">
          <h3>Comunicações por ano</h3>
          <p className="nota">Em rosa, as de ransomware. O último ano ainda está em andamento.</p>
          <Colunas cor="var(--neutro)" descricao="Comunicações à ANPD por ano."
            colunas={a.anos.map((x) => ({
              rotulo: x.ano, valor: x.incidentes, destaque: x.ransomware,
              dica: `${inteiro(x.incidentes)} comunicações${x.ransomware != null ? `, ${inteiro(x.ransomware)} de ransomware` : ""}`,
            }))} />
        </div>
        <div className="cartao">
          <h3>Tipos de incidente</h3>
          <p className="nota">Todas as comunicações desde 2021.</p>
          <Barras linhas={a.tipos} />
        </div>
      </div>
      <div className="cartao">
        <div className="titulo-com-filtro">
          <h3>Ransomware na ANPD</h3>
          <div className="abas" role="tablist" aria-label="Ver por">
            {(Object.keys(VISOES) as Visao[]).map((v) => (
              <button key={v} role="tab" aria-selected={visao === v} className={visao === v ? "aba ativa" : "aba"} onClick={() => setVisao(v)}>{VISOES[v]}</button>
            ))}
          </div>
        </div>
        <Tabela linhas={linhas} rotulo={VISOES[visao]} />
      </div>
      <div className="duas">
        <div className="cartao">
          <h3>Dados sensíveis violados?</h3>
          <p className="nota">Todas as comunicações desde 2021.</p>
          <Barras linhas={a.sensiveis} />
          <h3>Processos de apuração abertos pela ANPD</h3>
          <Barras linhas={a.processos} />
        </div>
        {a.ultimoAno && (
          <div className="cartao">
            <h3>Comunicações de {a.ultimoAno.ano}</h3>
            <h3>Provável impacto</h3>
            <Barras linhas={a.ultimoAno.impacto} />
            <h3>Titulares comunicados?</h3>
            <Barras linhas={a.ultimoAno.titulares} />
            <h3>Crianças ou adolescentes envolvidos?</h3>
            <Barras linhas={a.ultimoAno.criancas} />
            <h3>Tipo de comunicação</h3>
            <Barras linhas={a.ultimoAno.comunicacao} />
          </div>
        )}
      </div>
    </section>
  );
}

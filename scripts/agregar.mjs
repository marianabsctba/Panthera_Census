// Transforma os registros da fonte em números somados. Nada aqui grava em disco.
import { createHmac } from "node:crypto";
import {
  DIAS,
  FAIXAS,
  categoriasCitadas,
  faixaAtraso,
  faixaFaturamento,
  faixaFuncionarios,
  faixaVolume,
  faturamentoEmDolar,
  funcionarios,
  geradoPorIa,
  grupoApreendido,
  grupoSinalizado,
  nomeDeGrupo,
  situacaoCitada,
  volumeEmGb,
} from "./texto.mjs";

export const K = 3;
export const OUTROS = "Outros recortes";
export const NAO_INFORMADO = "Não informado";

const SETORES = {
  "Professional Services": "Serviços profissionais",
  Manufacturing: "Indústria",
  Technology: "Tecnologia",
  Healthcare: "Saúde",
  "Retail & E-Commerce": "Varejo",
  "Financial Services": "Financeiro",
  Transportation: "Transporte e logística",
  Education: "Educação",
  "Government & Defense": "Governo",
  "Agriculture and Food Production": "Agro e alimentos",
  "Energy & Utilities": "Energia e saneamento",
  Hospitality: "Hotelaria e lazer",
  Other: "Outros",
  "Not Found": NAO_INFORMADO,
};
// Categorias que a fonte não tem e a revisão usa.
export const SETORES_DA_REVISAO = ["Construção", "Imobiliário", "Mídia"];
export const TODOS_OS_SETORES = [...new Set(Object.values(SETORES)), ...SETORES_DA_REVISAO];

export const setorDaFonte = (activity) => SETORES[activity] ?? (activity ? "Outros" : NAO_INFORMADO);

const normalizar = (texto) => String(texto ?? "").trim().toLowerCase().replace(/\s+/g, " ");

// Código opaco do caso: sem o segredo, não dá para descobrir a empresa testando nomes.
export function chaveOpaca(segredo, registro) {
  return createHmac("sha256", segredo).update(`${registro.group_name}\n${normalizar(registro.post_title)}`).digest("hex");
}

export function wilson(x, n, z = 1.96) {
  if (n === 0) return [0, 0];
  const p = x / n;
  const den = 1 + (z * z) / n;
  const meio = (p + (z * z) / (2 * n)) / den;
  const marg = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return [Math.round((meio - marg) * 1000) / 10, Math.round((meio + marg) * 1000) / 10];
}

const contar = (lista, chave) => {
  const mapa = new Map();
  for (const item of lista) {
    const k = chave(item);
    if (k == null) continue;
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return mapa;
};
const emOrdem = (mapa) => [...mapa.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
const trimestre = (data) => `${data.slice(0, 4)} T${Math.floor((Number(data.slice(5, 7)) - 1) / 3) + 1}`;
const parte = (n, total) => (total ? Math.round((n * 1000) / total) / 10 : 0);
const naOrdem = (contagem, nomes) => nomes.filter((n) => (contagem.get(n) ?? 0) >= K).map((n) => [n, contagem.get(n)]);
const paraData = (texto) => new Date(`${String(texto).slice(0, 19).replace(" ", "T")}Z`);

// Recortes abaixo de K somem em um grupo só; se a soma ainda for pequena, ela também some.
export function semPequenos(contagem) {
  const grandes = emOrdem(contagem).filter(([, n]) => n >= K);
  const resto = [...contagem.values()].filter((n) => n < K).reduce((a, b) => a + b, 0);
  return resto >= K ? [...grandes, [OUTROS, resto]] : grandes;
}

export function inicioDoPeriodo(fim) {
  const d = new Date(`${fim}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Horário de cada caso, faixas e citações: nunca o texto.
function tempoETextos(lista) {
  const atrasos = new Map();
  const dias = new Map();
  const semAtraso = { n: 0 };
  for (const x of lista) {
    const achado = paraData(x.discovered);
    dias.set(DIAS[achado.getUTCDay()], (dias.get(DIAS[achado.getUTCDay()]) ?? 0) + 1);
    const publicado = paraData(x.published);
    const dif = (achado - publicado) / 86_400_000;
    if (Number.isFinite(dif) && dif >= 0) {
      const f = faixaAtraso(dif);
      atrasos.set(f, (atrasos.get(f) ?? 0) + 1);
    } else semAtraso.n++;
  }
  // Texto gerado por IA pela fonte não é alegação do criminoso.
  const textos = lista.map((x) => String(x.description ?? "")).filter((t) => t.length > 3 && !geradoPorIa(t));
  const volumes = contar(textos, (t) => { const v = volumeEmGb(t); return v == null ? null : faixaVolume(v); });
  const faturas = contar(textos, (t) => { const v = faturamentoEmDolar(t); return v == null ? null : faixaFaturamento(v); });
  const pessoas = contar(textos, (t) => { const v = funcionarios(t); return v == null ? null : faixaFuncionarios(v); });
  const citados = new Map();
  for (const t of textos) for (const c of categoriasCitadas(t)) citados.set(c, (citados.get(c) ?? 0) + 1);
  const soma = (m) => [...m.values()].reduce((a, b) => a + b, 0);
  const situacoes = contar(textos, situacaoCitada);
  return {
    tempo: {
      atraso: naOrdem(atrasos, FAIXAS.atraso),
      semana: naOrdem(dias, DIAS),
    },
    textos: {
      comTexto: textos.length,
      volume: { n: soma(volumes), faixas: naOrdem(volumes, FAIXAS.volume) },
      faturamento: { n: soma(faturas), faixas: naOrdem(faturas, FAIXAS.faturamento) },
      funcionarios: { n: soma(pessoas), faixas: naOrdem(pessoas, FAIXAS.funcionarios) },
      dados: emOrdem(citados).filter(([, n]) => n >= K),
      situacao: { n: soma(situacoes), faixas: emOrdem(situacoes).filter(([, n]) => n >= K) },
      comPrazo: textos.filter((t) => /deadline/i.test(t)).length,
    },
  };
}

// Um período inteiro: mapa, países, setores, grupos, tempo e o que dizem os textos.
function agregarPeriodo({ registros, revisao, pais, referencias }) {
  const fora = (x) => {
    const acao = revisao.get(x)?.acao;
    return acao === "estrangeiro" || acao === "duplicata";
  };
  const setorFinal = (x) => revisao.get(x)?.setor ?? setorDaFonte(x.activity);

  const brBruto = registros.filter((x) => x.country === "BR");
  const brFinal = brBruto.filter((x) => !fora(x));
  const brRevisados = brBruto.filter((x) => revisao.has(x));
  const contados = (acao) => brRevisados.filter((x) => revisao.get(x).acao === acao).length;

  const porPais = new Map();
  for (const x of registros) {
    if (!x.country || fora(x)) continue;
    if (!porPais.has(x.country)) porPais.set(x.country, []);
    porPais.get(x.country).push(x);
  }
  const paises = [...porPais.entries()]
    .filter(([, lista]) => lista.length >= K)
    .map(([cc, lista]) => {
      const ref = referencias[cc];
      // Países muito pequenos distorcem a conta por habitante, então ficam fora dela.
      const grande = (ref?.populacao ?? 0) >= 1_000_000;
      return {
        cc,
        num: pais.numerico(cc) ?? null,
        nome: pais.nome(cc) ?? cc,
        n: lista.length,
        porMilhao: grande ? Math.round((lista.length / ref.populacao) * 1e7) / 10 : null,
        porPib: grande && ref.pib ? Math.round((lista.length / ref.pib) * 1e12) / 10 : null,
        setores: semPequenos(contar(lista, setorFinal)).slice(0, 12),
        grupos: semPequenos(contar(lista, (x) => x.group_name)).slice(0, 6),
        trimestres: [...contar(lista, (x) => trimestre(x.discovered)).entries()]
          .filter(([, n]) => n >= K)
          .sort((a, b) => a[0].localeCompare(b[0])),
      };
    })
    .sort((a, b) => b.n - a.n || a.cc.localeCompare(b.cc));

  // Mapa por setor: quantas alegações de cada setor em cada país, só com K ou mais.
  const mapaSetor = {};
  for (const [cc, lista] of porPais) {
    for (const [setor, n] of contar(lista, setorFinal)) {
      if (n < K || setor === NAO_INFORMADO) continue;
      (mapaSetor[setor] ??= []).push([cc, n]);
    }
  }
  for (const lista of Object.values(mapaSetor)) lista.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const comPais = registros.filter((x) => x.country);
  const mundoSetor = contar(comPais, (x) => setorDaFonte(x.activity));
  const brFonteSetor = contar(brBruto, (x) => setorDaFonte(x.activity));
  const brFinalSetor = contar(brFinal, setorFinal);
  const setores = [...new Set([...mundoSetor.keys(), ...brFonteSetor.keys(), ...brFinalSetor.keys()])]
    .filter((s) => s !== NAO_INFORMADO && (brFinalSetor.get(s) ?? 0) >= K)
    .map((setor) => {
      const n = brFinalSetor.get(setor) ?? 0;
      return {
        setor,
        n,
        mundo: mundoSetor.has(setor) ? parte(mundoSetor.get(setor), comPais.length) : null,
        fonte: parte(brFonteSetor.get(setor) ?? 0, brBruto.length),
        revisado: parte(n, brFinal.length),
        margem: wilson(n, brFinal.length),
      };
    })
    .sort((a, b) => b.n - a.n || a.setor.localeCompare(b.setor));

  return {
    alegacoes: registros.length,
    comPais: comPais.length,
    paisesCitados: porPais.size,
    paisesVisiveis: paises.length,
    gruposAtivos: new Set(registros.map((x) => x.group_name)).size,
    brasil: {
      fonte: brBruto.length,
      final: brFinal.length,
      revisados: brRevisados.length,
      pendentes: brBruto.length - brRevisados.length,
      estrangeiros: contados("estrangeiro"),
      duplicatas: contados("duplicata"),
      setoresCorrigidos: contados("setor"),
      posicao: paises.findIndex((p) => p.cc === "BR") + 1,
    },
    paises,
    mapaSetor,
    setores,
    grupos: {
      mundo: emOrdem(contar(registros, (x) => x.group_name)).filter(([, n]) => n >= K).slice(0, 12),
      brasil: emOrdem(contar(brFinal, (x) => x.group_name)).filter(([, n]) => n >= K).slice(0, 8),
    },
    ...tempoETextos(registros),
  };
}

// A fonte marca o modelo de negócio como { raas: true }.
const ehRaas = (g) => g.type?.raas === true;

// Perfil de cada grupo com K alegações ou mais. Endereços, contatos e carteiras não entram.
function perfisDeGrupos({ registros, revisao, gruposFonte, pais, matrizes, inicio12m }) {
  const porNome = new Map();
  for (const g of gruposFonte) porNome.set(g.name, g);
  const lista = new Map();
  for (const x of registros) {
    if (!lista.has(x.group_name)) lista.set(x.group_name, []);
    lista.get(x.group_name).push(x);
  }
  const setorFinal = (x) => revisao.get(x)?.setor ?? setorDaFonte(x.activity);
  const fora = (x) => ["estrangeiro", "duplicata"].includes(revisao.get(x)?.acao);

  return [...lista.entries()]
    .filter(([, casos]) => casos.length >= K)
    .map(([nome, casos]) => {
      const g = porNome.get(nome) ?? {};
      const datas = casos.map((x) => x.discovered.slice(0, 7)).sort();
      const sites = g.locations ?? [];
      const chaves = new Set([nomeDeGrupo(nome), nomeDeGrupo(g.altname ?? "")].filter(Boolean));
      return {
        nome,
        raas: ehRaas(g),
        linhagem: g.lineage || null,
        outroNome: g.altname || null,
        primeira: datas[0],
        ultima: datas.at(-1),
        total: casos.length,
        dozeMeses: casos.filter((x) => x.discovered.slice(0, 10) >= inicio12m).length,
        noBrasil: casos.filter((x) => x.country === "BR" && !fora(x)).length,
        sites: sites.length,
        sitesNoAr: sites.filter((s) => s.available).length,
        sinalizado: grupoSinalizado(g.description),
        apreendido: grupoApreendido(g.meta, g.description),
        setores: emOrdem(contar(casos, setorFinal)).filter(([s, n]) => n >= K && s !== NAO_INFORMADO).slice(0, 6),
        paises: emOrdem(contar(casos.filter((x) => x.country && !fora(x)), (x) => pais.nome(x.country) ?? x.country)).filter(([, n]) => n >= K).slice(0, 6),
        anos: [...contar(casos, (x) => x.discovered.slice(0, 4)).entries()].filter(([, n]) => n >= K).sort((a, b) => a[0].localeCompare(b[0])),
        ferramentas: matrizes.ferramentas.filter((f) => f.grupos.some((n) => chaves.has(nomeDeGrupo(n)))).map((f) => [f.categoria, f.nome]),
        vulnerabilidades: matrizes.vulnerabilidades.filter((v) => v.grupos.some((n) => chaves.has(nomeDeGrupo(n)))).map((v) => [v.cve, v.produto]),
      };
    })
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));
}

/**
 * @param registros linhas da fonte, só em memória
 * @param correcoes mapa de código opaco para { acao, setor? }; vazio sem o segredo
 * @param chave função que dá o código opaco de um registro, ou null sem o segredo
 * @param pais { nome(cc), numerico(cc) }
 * @param anpd números oficiais transcritos à mão
 * @param referencias { cc: { populacao, pib } }
 * @param gruposFonte groups.json da fonte
 * @param matrizes { ferramentas, vulnerabilidades }, vazias se a fonte falhar
 * @param ecossistema totais do RansomLook, ou null
 */
export function agregar({ registros, correcoes, chave, pais, anpd, referencias = {}, gruposFonte = [], matrizes = { ferramentas: [], vulnerabilidades: [] }, ecossistema = null }) {
  const fim = registros.reduce((m, x) => (x.discovered.slice(0, 10) > m ? x.discovered.slice(0, 10) : m), "");
  const inicio12m = inicioDoPeriodo(fim);

  const revisao = new Map();
  if (chave) {
    for (const x of registros) {
      if (x.country !== "BR") continue;
      const c = correcoes[chave(x)];
      if (c) revisao.set(x, c);
    }
  }

  const contexto = { revisao, pais, referencias };
  const anos = [...new Set(registros.map((x) => x.discovered.slice(0, 4)))].filter((a) => a >= "2021").sort().reverse();
  const periodos = {
    "12m": agregarPeriodo({ ...contexto, registros: registros.filter((x) => x.discovered.slice(0, 10) >= inicio12m) }),
    tudo: agregarPeriodo({ ...contexto, registros }),
  };
  for (const ano of anos) periodos[ano] = agregarPeriodo({ ...contexto, registros: registros.filter((x) => x.discovered.startsWith(ano)) });

  const meses = contar(registros, (x) => x.discovered.slice(0, 7));
  const mesesBr = contar(registros.filter((x) => x.country === "BR"), (x) => x.discovered.slice(0, 7));
  const primeira = new Map();
  for (const x of [...registros].sort((a, b) => a.discovered.localeCompare(b.discovered))) {
    if (!primeira.has(x.group_name)) primeira.set(x.group_name, x.discovered.slice(0, 4));
  }
  const grupos = perfisDeGrupos({ registros, revisao, gruposFonte, pais, matrizes, inicio12m });

  const usoDeFerramentas = matrizes.ferramentas
    .map((f) => ({ nome: f.nome, categoria: f.categoria, grupos: new Set(f.grupos.map(nomeDeGrupo)).size }))
    .sort((a, b) => b.grupos - a.grupos || a.nome.localeCompare(b.nome))
    .slice(0, 20);
  const usoDeCves = new Map();
  for (const v of matrizes.vulnerabilidades) {
    const atual = usoDeCves.get(v.cve) ?? { cve: v.cve, produto: v.produto, grupos: new Set() };
    v.grupos.forEach((g) => atual.grupos.add(nomeDeGrupo(g)));
    usoDeCves.set(v.cve, atual);
  }
  const topoDeCves = [...usoDeCves.values()]
    .map((v) => ({ cve: v.cve, produto: v.produto, grupos: v.grupos.size }))
    .sort((a, b) => b.grupos - a.grupos || b.cve.localeCompare(a.cve))
    .slice(0, 20);

  return {
    resumo: {
      periodo: { inicio: inicio12m, fim },
      total: registros.length,
      gruposNaBase: new Set(registros.map((x) => x.group_name)).size,
      anosDisponiveis: anos,
      meses: [...meses.keys()].filter((m) => m >= "2021-01").sort().map((mes) => ({ mes, mundo: meses.get(mes) ?? 0, brasil: mesesBr.get(mes) ?? 0 })),
      gruposNovos: [...contar([...primeira.values()], (a) => a).entries()].sort((a, b) => a[0].localeCompare(b[0])),
      tipos: { raas: gruposFonte.filter(ehRaas).length, comLinhagem: gruposFonte.filter((g) => g.lineage).length, sinalizados: gruposFonte.filter((g) => grupoSinalizado(g.description)).length, comSiteNoAr: gruposFonte.filter((g) => (g.locations ?? []).some((s) => s.available)).length, total: gruposFonte.length },
      ecossistema,
      ferramentas: usoDeFerramentas,
      vulnerabilidades: topoDeCves,
      totaisMatrizes: { ferramentas: matrizes.ferramentas.length, vulnerabilidades: usoDeCves.size },
      anpd,
    },
    periodos,
    grupos,
  };
}

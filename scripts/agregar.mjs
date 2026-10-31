// Transforma os registros da fonte em números somados. Nada aqui grava em disco.
import { createHmac } from "node:crypto";

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
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return mapa;
};
const emOrdem = (mapa) => [...mapa.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
const trimestre = (data) => `${data.slice(0, 4)} T${Math.floor((Number(data.slice(5, 7)) - 1) / 3) + 1}`;
const parte = (n, total) => (total ? Math.round((n * 1000) / total) / 10 : 0);

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

/**
 * @param registros linhas da fonte, só em memória
 * @param correcoes mapa de código opaco para { acao, setor? }; vazio sem o segredo
 * @param chave função que dá o código opaco de um registro, ou null sem o segredo
 * @param pais { nome(cc), numerico(cc) }
 * @param anpd números oficiais transcritos à mão
 */
export function agregar({ registros, correcoes, chave, pais, anpd }) {
  const fim = registros.reduce((m, x) => (x.discovered.slice(0, 10) > m ? x.discovered.slice(0, 10) : m), "");
  const inicio = inicioDoPeriodo(fim);
  const recentes = registros.filter((x) => x.discovered.slice(0, 10) >= inicio);

  const brBruto = recentes.filter((x) => x.country === "BR");
  const revisao = new Map();
  let pendentes = 0;
  for (const x of brBruto) {
    const c = chave ? correcoes[chave(x)] : undefined;
    if (c) revisao.set(x, c);
    else pendentes++;
  }
  const fora = (x) => {
    const acao = revisao.get(x)?.acao;
    return acao === "estrangeiro" || acao === "duplicata";
  };
  const setorFinal = (x) => revisao.get(x)?.setor ?? setorDaFonte(x.activity);
  const contados = (acao) => [...revisao.values()].filter((c) => c.acao === acao).length;
  const brFinal = brBruto.filter((x) => !fora(x));

  const porPais = new Map();
  for (const x of recentes) {
    if (!x.country || fora(x)) continue;
    if (!porPais.has(x.country)) porPais.set(x.country, []);
    porPais.get(x.country).push(x);
  }
  const paises = [...porPais.entries()]
    .filter(([, lista]) => lista.length >= K)
    .map(([cc, lista]) => ({
      cc,
      num: pais.numerico(cc) ?? null,
      nome: pais.nome(cc) ?? cc,
      n: lista.length,
      setores: semPequenos(contar(lista, setorFinal)).slice(0, 12),
      grupos: semPequenos(contar(lista, (x) => x.group_name)).slice(0, 6),
      trimestres: [...contar(lista, (x) => trimestre(x.discovered)).entries()]
        .filter(([, n]) => n >= K)
        .sort((a, b) => a[0].localeCompare(b[0])),
    }))
    .sort((a, b) => b.n - a.n || a.cc.localeCompare(b.cc));

  const comPais = recentes.filter((x) => x.country);
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

  const meses = contar(registros, (x) => x.discovered.slice(0, 7));
  const mesesBr = contar(registros.filter((x) => x.country === "BR"), (x) => x.discovered.slice(0, 7));

  return {
    periodo: { inicio, fim },
    total: registros.length,
    gruposNaBase: new Set(registros.map((x) => x.group_name)).size,
    doze: {
      alegacoes: recentes.length,
      comPais: comPais.length,
      paises: porPais.size,
      paisesVisiveis: paises.length,
      grupos: new Set(recentes.map((x) => x.group_name)).size,
    },
    brasil: {
      fonte: brBruto.length,
      final: brFinal.length,
      revisados: revisao.size,
      pendentes,
      estrangeiros: contados("estrangeiro"),
      duplicatas: contados("duplicata"),
      setoresCorrigidos: contados("setor"),
      posicao: paises.findIndex((p) => p.cc === "BR") + 1,
    },
    meses: [...meses.keys()]
      .filter((m) => m >= "2024-01")
      .sort()
      .map((mes) => ({ mes, mundo: meses.get(mes) ?? 0, brasil: mesesBr.get(mes) ?? 0 })),
    paises,
    setores,
    grupos: {
      mundo: emOrdem(contar(recentes, (x) => x.group_name)).filter(([, n]) => n >= K).slice(0, 12),
      brasil: emOrdem(contar(brFinal, (x) => x.group_name)).filter(([, n]) => n >= K).slice(0, 8),
    },
    anpd,
  };
}

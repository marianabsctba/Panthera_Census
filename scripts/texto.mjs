// Lê o que o próprio criminoso escreveu na alegação e devolve só faixas. O texto nunca sai daqui.

export const FAIXAS = {
  volume: ["Até 10 GB", "10 a 100 GB", "100 a 500 GB", "500 GB a 1 TB", "Mais de 1 TB"],
  faturamento: ["Até US$ 10 mi", "US$ 10 a 50 mi", "US$ 50 a 200 mi", "US$ 200 mi a 1 bi", "Mais de US$ 1 bi"],
  funcionarios: ["Até 50", "51 a 200", "201 a 1.000", "1.001 a 5.000", "Mais de 5.000"],
  atraso: ["No mesmo dia", "1 a 7 dias", "8 a 30 dias", "31 a 90 dias", "Mais de 90 dias"],
};

export const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const CATEGORIAS = {
  "Dados pessoais": /personal|\bpii\b|passport|\bssn\b|driver.?licen|\bid card|\bcpf\b/i,
  "Dados financeiros": /financ|bank|invoice|accounting|balance sheet|payment/i,
  "Dados de saúde": /medical|patient|health record|\bphi\b|\bhipaa\b/i,
  "Recursos humanos": /\bhr\b|payroll|employee (data|record|file)|human resources|personnel/i,
  "Clientes": /customer|client (data|record|file|info)|clients? data/i,
  "Contratos e jurídico": /contract|\bnda\b|legal|agreement/i,
  "Bases e credenciais": /database|\bsql\b|credential|password|backup/i,
  "Projetos e código": /source code|project|\bcad\b|drawing|blueprint/i,
};
export const NOMES_CATEGORIAS = Object.keys(CATEGORIAS);

const SITUACOES = [
  ["Não pagou", /not paid/i],
  ["Em negociação", /negotiating/i],
  ["Vazou", /\bleaked\b/i],
  ["Publicação anunciada", /pending exposure|\bupcoming\b|publication scheduled/i],
];
export const NOMES_SITUACOES = SITUACOES.map(([nome]) => nome);

// Vírgula ou ponto seguidos de 3 dígitos separam milhar; os demais são decimal.
function numeroDoTexto(bruto) {
  const limpo = bruto.trim();
  if (/^\d{1,3}([.,]\d{3})+$/.test(limpo)) return Number(limpo.replace(/[.,]/g, ""));
  return Number(limpo.replace(",", "."));
}

const faixa = (valor, limites, nomes) => {
  const i = limites.findIndex((l) => valor <= l);
  return nomes[i === -1 ? nomes.length - 1 : i];
};

export function volumeEmGb(texto) {
  const m = /\b(\d+(?:[.,]\d+)*)\s?(MB|GB|TB)\b/i.exec(texto);
  if (!m) return null;
  const n = numeroDoTexto(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n * { MB: 1 / 1024, GB: 1, TB: 1024 }[m[2].toUpperCase()];
}

export function faturamentoEmDolar(texto) {
  const m = /revenue\W{0,6}(\d+(?:[.,]\d+)*)\s*(million|billion|thousand|mn|bn|m|b|k)?\b/i.exec(texto);
  if (!m) return null;
  const n = numeroDoTexto(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const mult = { million: 1e6, mn: 1e6, m: 1e6, billion: 1e9, bn: 1e9, b: 1e9, thousand: 1e3, k: 1e3 }[(m[2] ?? "").toLowerCase()] ?? 1;
  return n * mult;
}

export function funcionarios(texto) {
  const m = /employees\W{0,6}(\d+(?:[.,]\d+)*)/i.exec(texto);
  if (!m) return null;
  const n = numeroDoTexto(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const faixaVolume = (gb) => faixa(gb, [10, 100, 500, 1024], FAIXAS.volume);
export const faixaFaturamento = (d) => faixa(d, [1e7, 5e7, 2e8, 1e9], FAIXAS.faturamento);
export const faixaFuncionarios = (n) => faixa(n, [50, 200, 1000, 5000], FAIXAS.funcionarios);
export const faixaAtraso = (dias) => faixa(dias, [0.999, 7, 30, 90], FAIXAS.atraso);

export const geradoPorIa = (texto) => /^\s*\[?AI generated/i.test(texto);
export const categoriasCitadas = (texto) => NOMES_CATEGORIAS.filter((c) => CATEGORIAS[c].test(texto));
export const situacaoCitada = (texto) => SITUACOES.find(([, p]) => p.test(texto))?.[0] ?? null;

// Só o aviso explícito da própria fonte. Palavra solta na história do grupo não conta.
export const grupoSinalizado = (descricao) =>
  /appears unreliable|fake group|fake victims|seems to recycle|suspected fraudulent/i.test(descricao ?? "");
export const grupoApreendido = (meta, descricao) => /seized/i.test(`${meta ?? ""}`) || /site (was|has been) seized/i.test(descricao ?? "");

// Tabelas em Markdown: devolve as células de cada linha de dados.
export function linhasDaTabela(markdown) {
  return markdown
    .split("\n")
    .filter((l) => l.trim().startsWith("|"))
    .map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()))
    .filter((c) => !c.every((x) => /^:?-*:?$/.test(x)));
}

export const nomeDeGrupo = (texto) => texto.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/\d+$/, "");
const separarGrupos = (celula) => celula.split(",").map((g) => g.replace(/[*+]/g, "").trim()).filter(Boolean);

export function lerFerramentas(categoria, markdown) {
  return linhasDaTabela(markdown)
    .filter(([nome, grupos]) => nome && grupos && nome !== "Tool Name")
    .map(([nome, grupos]) => ({ categoria, nome, grupos: separarGrupos(grupos) }));
}

export function lerVulnerabilidades(categoria, markdown) {
  const saida = [];
  for (const [produto, cves, grupos] of linhasDaTabela(markdown)) {
    if (!grupos || produto === "Product") continue;
    for (const cve of cves.match(/CVE-\d{4}-\d{4,7}/g) ?? []) {
      saida.push({ categoria, produto, cve, grupos: separarGrupos(grupos) });
    }
  }
  return saida;
}

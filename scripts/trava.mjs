// A trava: o que sai só passa se cada texto for conhecido e cada recorte tiver K casos ou mais.
import { K, OUTROS, TODOS_OS_SETORES } from "./agregar.mjs";

const FORMATOS = [
  /^\d{4}$/, // ano
  /^\d{4}-\d{2}(-\d{2})?$/, // mês ou data
  /^\d{4} T[1-4]$/, // trimestre
  /^[A-Z]{2}$/, // sigla de país
  /^\d{3}$/, // código numérico de país
];

// Só nomes de grupo, de país e de setor podem aparecer como texto. Não existe lista de "nomes
// proibidos": o que não está autorizado para a publicação, inclusive qualquer vítima.
export function validarSaida(saida, { grupos, paises }) {
  const permitidos = new Set([...grupos, ...paises, ...TODOS_OS_SETORES, OUTROS]);
  const erros = [];
  const percorrer = (valor, caminho) => {
    if (typeof valor === "string") {
      if (!permitidos.has(valor) && !FORMATOS.some((f) => f.test(valor))) erros.push(`texto desconhecido em ${caminho}`);
    } else if (Array.isArray(valor)) {
      valor.forEach((v, i) => percorrer(v, `${caminho}[${i}]`));
    } else if (valor && typeof valor === "object") {
      for (const [k, v] of Object.entries(valor)) percorrer(v, `${caminho}.${k}`);
    }
  };
  percorrer(saida, "saida");

  for (const p of saida.paises) {
    if (p.n < K) erros.push(`país abaixo de ${K}: ${p.cc}`);
    for (const lista of [p.setores, p.grupos, p.trimestres]) {
      for (const [, n] of lista) if (n < K) erros.push(`recorte abaixo de ${K} em ${p.cc}`);
    }
  }
  for (const s of saida.setores) if (s.n < K) erros.push(`setor abaixo de ${K}: ${s.setor}`);
  for (const lista of [saida.grupos.mundo, saida.grupos.brasil]) {
    for (const [, n] of lista) if (n < K) erros.push(`grupo abaixo de ${K}`);
  }
  return erros;
}

// O arquivo de correções só pode ter códigos opacos e valores conhecidos.
export function validarCorrecoes(correcoes) {
  const erros = [];
  for (const [chave, c] of Object.entries(correcoes)) {
    if (!/^[0-9a-f]{64}$/.test(chave)) erros.push("chave de correção fora do formato");
    if (!["ok", "estrangeiro", "duplicata", "setor"].includes(c.acao)) erros.push("ação desconhecida");
    if (c.acao === "setor" && !TODOS_OS_SETORES.includes(c.setor)) erros.push("setor desconhecido");
    if (c.acao !== "setor" && c.setor !== undefined) erros.push("setor sobrando");
    if (Object.keys(c).some((k) => k !== "acao" && k !== "setor")) erros.push("campo desconhecido");
  }
  return erros;
}

// Endereços que o projeto cita como fonte ou crédito, e que também podem constar como alegação.
const INSTITUCIONAIS = new Set(["gov.br", "github.com", "ransomware.live", "naturalearthdata.com", "unlicense.org", "gnu.org", "fsf.org"]);

// Domínio de vítima em qualquer arquivo versionado barra a publicação.
export function dominioNoTexto(texto, dominios) {
  const baixo = texto.toLowerCase();
  const achados = baixo.match(/[a-z0-9-]+(\.[a-z0-9-]+)+/g) ?? [];
  return achados.map((d) => d.replace(/^www\./, "")).filter((d) => dominios.has(d) && !INSTITUCIONAIS.has(d));
}

// Fonte cortada ou trocada não pode virar queda real.
export function validarFonte(registros, totalAnterior) {
  const erros = [];
  if (!Array.isArray(registros) || registros.length < 30000) erros.push("a fonte veio cortada");
  else if (totalAnterior && registros.length < totalAnterior * 0.9) erros.push("a fonte caiu mais de 10%");
  const amostra = Array.isArray(registros) ? registros.slice(0, 1000) : [];
  for (const campo of ["group_name", "post_title", "discovered"]) {
    if (amostra.some((x) => typeof x[campo] !== "string")) erros.push(`campo ausente: ${campo}`);
  }
  return erros;
}

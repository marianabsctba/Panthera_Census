// A trava: o que sai só passa se cada texto for conhecido e cada recorte tiver K casos ou mais.
import { K, OUTROS, TODOS_OS_SETORES } from "./agregar.mjs";
import { DIAS, FAIXAS, FONTES_DE_PESQUISA, NOMES_CATEGORIAS, NOMES_SITUACOES, fonteDaReferencia } from "./texto.mjs";

const FORMATOS = [
  /^\d{4}$/, // ano
  /^\d{4}-\d{2}(-\d{2})?$/, // mês ou data
  /^\d{4} T[1-4]$/, // trimestre
  /^[A-Z]{2}$/, // sigla de país
  /^\d{3}$/, // código numérico de país
  /^CVE-\d{4}-\d{4,7}$/, // vulnerabilidade
];
const FIXOS = [...TODOS_OS_SETORES, OUTROS, ...DIAS, ...Object.values(FAIXAS).flat(), ...NOMES_CATEGORIAS, ...NOMES_SITUACOES];

function recolher(valor, conjunto) {
  if (typeof valor === "string") conjunto.add(valor);
  else if (Array.isArray(valor)) valor.forEach((v) => recolher(v, conjunto));
  else if (valor && typeof valor === "object") Object.values(valor).forEach((v) => recolher(v, conjunto));
  return conjunto;
}

// Só nomes de grupo, de país, de setor, de ferramenta e os textos oficiais da ANPD podem aparecer.
// Não existe lista de "nomes proibidos": o que não está autorizado não sai, inclusive qualquer vítima.
export function validarSaida(saida, { grupos, paises, ferramentas = [], produtos = [], categorias = [] }) {
  const permitidos = new Set([...grupos, ...paises, ...ferramentas, ...produtos, ...categorias, ...FIXOS]);
  recolher(saida.resumo.anpd, permitidos);
  const erros = [];
  const percorrer = (valor, caminho) => {
    if (typeof valor === "string") {
      if (!permitidos.has(valor) && !FORMATOS.some((f) => f.test(valor))) erros.push(`texto desconhecido em ${caminho}`);
    } else if (Array.isArray(valor)) {
      valor.forEach((v, i) => percorrer(v, `${caminho}[${i}]`));
    } else if (valor && typeof valor === "object") {
      for (const [k, v] of Object.entries(valor)) {
        // Link só de fonte de pesquisa conhecida: nunca o endereço de um grupo ou de uma vítima.
        if (k === "referencias") {
          for (const url of v) if (!fonteDaReferencia(url) || /\.onion/i.test(url)) erros.push(`link não autorizado em ${caminho}`);
        } else percorrer(v, `${caminho}.${k}`);
      }
    }
  };
  percorrer(saida, "saida");

  const conferir = (lista, onde) => {
    for (const item of lista) if (item[1] < K) erros.push(`recorte abaixo de ${K} em ${onde}`);
  };
  for (const [nome, p] of Object.entries(saida.periodos)) {
    for (const pais of p.paises) {
      if (pais.n < K) erros.push(`país abaixo de ${K} em ${nome}`);
      for (const lista of [pais.setores, pais.grupos, pais.trimestres]) conferir(lista, `${nome}/${pais.cc}`);
    }
    for (const s of p.setores) if (s.n < K) erros.push(`setor abaixo de ${K} em ${nome}`);
    for (const lista of Object.values(p.mapaSetor)) conferir(lista, `${nome}/mapa`);
    conferir(p.grupos.mundo, nome);
    conferir(p.grupos.brasil, nome);
    conferir(p.tempo.atraso, nome);
    conferir(p.tempo.semana, nome);
    conferir(p.textos.dados, nome);
    for (const bloco of [p.textos.volume, p.textos.faturamento, p.textos.funcionarios, p.textos.situacao]) conferir(bloco.faixas, nome);
  }
  for (const g of saida.grupos) {
    if (g.total < K) erros.push(`grupo abaixo de ${K}`);
    for (const lista of [g.setores, g.paises, g.anos]) conferir(lista, "perfil de grupo");
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
const INSTITUCIONAIS = new Set(["gov.br", "github.com", "ransomware.live", "naturalearthdata.com", "worldbank.org", "ransomlook.io", "githubusercontent.com", ...FONTES_DE_PESQUISA]);

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

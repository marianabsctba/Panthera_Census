// Baixa a fonte, soma, passa pela trava e só então grava. O dado bruto fica só em memória.
import { execFileSync } from "node:child_process";
import { setDefaultResultOrder } from "node:dns";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { agregar, chaveOpaca } from "./agregar.mjs";
import { dominioNoTexto, validarCorrecoes, validarFonte, validarSaida } from "./trava.mjs";

const require = createRequire(import.meta.url);
const paises = require("i18n-iso-countries");
paises.registerLocale(require("i18n-iso-countries/langs/pt.json"));

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONTE = "https://data.ransomware.live/victims.json";
const HISTORICO = join(RAIZ, "historico", "resumo.csv");
const ler = (caminho) => JSON.parse(readFileSync(join(RAIZ, caminho), "utf8"));

function falhar(erros) {
  // Só as mensagens da trava vão para o log, que é público.
  console.error(`Publicação barrada:\n- ${[...new Set(erros)].join("\n- ")}`);
  process.exit(1);
}

function ultimoTotal() {
  if (!existsSync(HISTORICO)) return 0;
  const linhas = readFileSync(HISTORICO, "utf8").trim().split("\n");
  return linhas.length > 1 ? Number(linhas.at(-1).split(",")[1]) : 0;
}

async function baixar() {
  let ultimo = "sem resposta";
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const resposta = await fetch(FONTE, {
        headers: { "user-agent": "Panthera Census (github.com/marianabsctba/Panthera_Census)" },
        signal: AbortSignal.timeout(120_000),
      });
      if (resposta.ok) return await resposta.json();
      ultimo = `resposta ${resposta.status}`;
    } catch (erro) {
      ultimo = erro.cause?.code ?? erro.name;
    }
    await new Promise((r) => setTimeout(r, tentativa * 5000));
  }
  falhar([`a fonte não respondeu: ${ultimo}`]);
}

// Algumas redes anunciam IPv6 sem conseguir usá-lo; IPv4 primeiro evita o tempo esgotado.
setDefaultResultOrder("ipv4first");
const registros = await baixar();
const errosFonte = validarFonte(registros, ultimoTotal());
if (errosFonte.length) falhar(errosFonte);

const segredo = process.env.CENSUS_SEGREDO;
if (!segredo && process.env.CENSUS_EXIGE_SEGREDO === "1") falhar(["falta o segredo da curadoria"]);
if (!segredo) console.warn("Sem o segredo da curadoria: o Brasil sai como veio da fonte.");

const correcoes = ler("curadoria/correcoes.json");
const errosCorrecoes = validarCorrecoes(correcoes);
if (errosCorrecoes.length) falhar(errosCorrecoes);

const saida = agregar({
  registros,
  correcoes,
  chave: segredo ? (r) => chaveOpaca(segredo, r) : null,
  pais: {
    nome: (cc) => paises.getName(cc, "pt", { select: "official" }),
    numerico: (cc) => paises.alpha2ToNumeric(cc),
  },
  anpd: ler("curadoria/anpd.json"),
});

const grupos = new Set(registros.map((x) => x.group_name));
const nomesDePaises = new Set(saida.paises.map((p) => p.nome));
const erros = validarSaida(saida, { grupos, paises: nomesDePaises });

// Nenhum arquivo versionado pode citar o site de uma vítima.
const dominios = new Set();
for (const x of registros) {
  const site = String(x.website ?? "").toLowerCase().trim().replace(/^https?:\/\/|^www\./g, "").split("/")[0];
  if (site.includes(".")) dominios.add(site);
}
const versionados = execFileSync("git", ["ls-files"], { cwd: RAIZ, encoding: "utf8" }).split("\n").filter(Boolean);
for (const arquivo of versionados) {
  if (arquivo === "package-lock.json" || /\.(png|webp)$/.test(arquivo)) continue;
  if (dominioNoTexto(readFileSync(join(RAIZ, arquivo), "utf8"), dominios).length) erros.push(`domínio de vítima em ${arquivo}`);
}
if (erros.length) falhar(erros);

mkdirSync(join(RAIZ, "public", "dados"), { recursive: true });
writeFileSync(join(RAIZ, "public", "dados", "census.json"), JSON.stringify(saida));

mkdirSync(dirname(HISTORICO), { recursive: true });
const cabecalho = "data,total,doze_meses,brasil_fonte,brasil_final,pendentes\n";
const atual = existsSync(HISTORICO) ? readFileSync(HISTORICO, "utf8") : cabecalho;
const linhas = atual.trim().split("\n").filter((l) => !l.startsWith(`${saida.periodo.fim},`));
linhas.push([saida.periodo.fim, saida.total, saida.doze.alegacoes, saida.brasil.fonte, saida.brasil.final, saida.brasil.pendentes].join(","));
writeFileSync(HISTORICO, `${linhas.join("\n")}\n`);

console.log(`Publicável: ${saida.doze.alegacoes} alegações em 12 meses, ${saida.paises.length} países visíveis, ${saida.brasil.revisados} casos do Brasil revisados e ${saida.brasil.pendentes} pendentes.`);

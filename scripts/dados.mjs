// Baixa as fontes, soma, passa pela trava e só então grava. O dado bruto fica só em memória.
import { execFileSync } from "node:child_process";
import { setDefaultResultOrder } from "node:dns";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { agregar, chaveOpaca } from "./agregar.mjs";
import { lerFerramentas, lerVulnerabilidades } from "./texto.mjs";
import { dominioNoTexto, validarCorrecoes, validarFonte, validarSaida } from "./trava.mjs";

const require = createRequire(import.meta.url);
const paises = require("i18n-iso-countries");
paises.registerLocale(require("i18n-iso-countries/langs/pt.json"));

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const VITIMAS = "https://data.ransomware.live/victims.json";
const GRUPOS = "https://data.ransomware.live/groups.json";
const ECOSSISTEMA = "https://www.ransomlook.io/api/stats";
const GRUPOS_RANSOMLOOK = "https://www.ransomlook.io/api/groups";
const MATRIZ_FERRAMENTAS = "https://raw.githubusercontent.com/BushidoUK/Ransomware-Tool-Matrix/main/Tools/";
const MATRIZ_CVES = "https://raw.githubusercontent.com/BushidoUK/Ransomware-Vulnerability-Matrix/main/Vulnerabilities/";
const CATEGORIAS_FERRAMENTAS = {
  "CredentialTheft.md": "Roubo de credenciais",
  "DefenseEvasion.md": "Evasão de defesas",
  "DiscoveryEnum.md": "Reconhecimento",
  "Exfiltration.md": "Exfiltração",
  "LOLBAS.md": "Ferramentas do sistema",
  "Networking.md": "Rede e túneis",
  "Offsec.md": "Ferramentas ofensivas",
  "RMM-Tools.md": "Acesso remoto",
};
const CATEGORIAS_CVES = {
  "Applications.md": "Aplicações",
  "Drivers.md": "Drivers",
  "FileTransferServers.md": "Transferência de arquivos",
  "Linux.md": "Linux",
  "Microsoft.md": "Microsoft",
  "NetworkEdge.md": "Borda de rede",
  "RMM_Tools.md": "Acesso remoto",
  "Virtualization.md": "Virtualização",
};
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

async function baixar(url, como = "json") {
  let ultimo = "sem resposta";
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const resposta = await fetch(url, {
        headers: { "user-agent": "Panthera Census (github.com/marianabsctba/Panthera_Census)" },
        signal: AbortSignal.timeout(120_000),
      });
      if (resposta.ok) return await resposta[como]();
      ultimo = `resposta ${resposta.status}`;
    } catch (erro) {
      ultimo = erro.cause?.code ?? erro.name;
    }
    await new Promise((r) => setTimeout(r, tentativa * 3000));
  }
  throw new Error(ultimo);
}

// Fonte complementar fora do ar não derruba o censo: a seção só fica vazia naquele dia.
async function opcional(rotulo, tarefa, reserva) {
  try {
    return await tarefa();
  } catch (erro) {
    console.warn(`Sem ${rotulo} hoje: ${erro.message}`);
    return reserva;
  }
}

async function lerMatriz(base, categorias, leitor) {
  const partes = await Promise.all(
    Object.entries(categorias).map(async ([arquivo, categoria]) => leitor(categoria, await baixar(base + arquivo, "text"))),
  );
  return partes.flat();
}

// Algumas redes anunciam IPv6 sem conseguir usá-lo; IPv4 primeiro evita o tempo esgotado.
setDefaultResultOrder("ipv4first");

let registros;
try {
  registros = await baixar(VITIMAS);
} catch (erro) {
  falhar([`a fonte não respondeu: ${erro.message}`]);
}
const errosFonte = validarFonte(registros, ultimoTotal());
if (errosFonte.length) falhar(errosFonte);

const [gruposFonte, gruposRansomLook, ferramentas, vulnerabilidades, ecossistema] = await Promise.all([
  opcional("grupos", () => baixar(GRUPOS), []),
  opcional("grupos do RansomLook", () => baixar(GRUPOS_RANSOMLOOK), []),
  opcional("ferramentas", () => lerMatriz(MATRIZ_FERRAMENTAS, CATEGORIAS_FERRAMENTAS, lerFerramentas), []),
  opcional("vulnerabilidades", () => lerMatriz(MATRIZ_CVES, CATEGORIAS_CVES, lerVulnerabilidades), []),
  opcional("totais do ecossistema", () => baixar(ECOSSISTEMA), null),
]);

const segredo = process.env.CENSUS_SEGREDO;
if (!segredo && process.env.CENSUS_EXIGE_SEGREDO === "1") falhar(["falta o segredo da curadoria"]);
if (!segredo) console.warn("Sem o segredo da curadoria: o Brasil sai como veio da fonte.");

const correcoes = ler("curadoria/correcoes.json");
const errosCorrecoes = validarCorrecoes(correcoes);
if (errosCorrecoes.length) falhar(errosCorrecoes);

const nomePais = (cc) => paises.getName(cc, "pt", { select: "official" });
const saida = agregar({
  registros,
  correcoes,
  chave: segredo ? (r) => chaveOpaca(segredo, r) : null,
  pais: { nome: nomePais, numerico: (cc) => paises.alpha2ToNumeric(cc) },
  anpd: ler("curadoria/anpd.json"),
  referencias: ler("curadoria/referencias.json").paises,
  gruposFonte,
  gruposRansomLook,
  enderecos: ler("curadoria/enderecos.json"),
  matrizes: { ferramentas, vulnerabilidades },
  ecossistema: ecossistema && {
    grupos: ecossistema.groups,
    gruposNoAr: ecossistema.groups_online,
    sitesDeVazamento: ecossistema.groups_dls,
    mercados: ecossistema.markets,
    mercadosNoAr: ecossistema.markets_online,
    publicacoes90d: ecossistema.posts_90d,
  },
});

const grupos = new Set(registros.map((x) => x.group_name));
for (const g of gruposFonte) for (const t of [g.name, g.altname, g.lineage]) if (t) grupos.add(t);
for (const nome of gruposRansomLook) grupos.add(nome);
const erros = validarSaida(saida, {
  grupos,
  paises: new Set(registros.map((x) => x.country).filter(Boolean).map(nomePais).filter(Boolean)),
  ferramentas: ferramentas.map((f) => f.nome),
  produtos: vulnerabilidades.map((v) => v.produto),
  categorias: [...Object.values(CATEGORIAS_FERRAMENTAS), ...Object.values(CATEGORIAS_CVES)],
});

// Nenhum arquivo versionado pode citar o site de uma vítima.
const dominios = new Set();
for (const x of registros) {
  const site = String(x.website ?? "").toLowerCase().trim().replace(/^https?:\/\/|^www\./g, "").split("/")[0];
  if (site.includes(".")) dominios.add(site);
}
const versionados = execFileSync("git", ["ls-files"], { cwd: RAIZ, encoding: "utf8" }).split("\n").filter(Boolean);
for (const arquivo of versionados) {
  if (arquivo === "package-lock.json" || /\.(png|webp)$/.test(arquivo) || !existsSync(join(RAIZ, arquivo))) continue;
  if (dominioNoTexto(readFileSync(join(RAIZ, arquivo), "utf8"), dominios).length) erros.push(`domínio de vítima em ${arquivo}`);
}
if (erros.length) falhar(erros);

const destino = join(RAIZ, "public", "dados");
rmSync(destino, { recursive: true, force: true });
mkdirSync(destino, { recursive: true });
writeFileSync(join(destino, "resumo.json"), JSON.stringify(saida.resumo));
writeFileSync(join(destino, "grupos.json"), JSON.stringify(saida.grupos));
for (const [nome, periodo] of Object.entries(saida.periodos)) {
  writeFileSync(join(destino, `periodo-${nome}.json`), JSON.stringify(periodo));
}

const d = saida.periodos["12m"];
mkdirSync(dirname(HISTORICO), { recursive: true });
const cabecalho = "data,total,doze_meses,brasil_fonte,brasil_final,pendentes\n";
const atual = existsSync(HISTORICO) ? readFileSync(HISTORICO, "utf8") : cabecalho;
const linhas = atual.trim().split("\n").filter((l) => !l.startsWith(`${saida.resumo.periodo.fim},`));
linhas.push([saida.resumo.periodo.fim, saida.resumo.total, d.alegacoes, d.brasil.fonte, d.brasil.final, d.brasil.pendentes].join(","));
writeFileSync(HISTORICO, `${linhas.join("\n")}\n`);

console.log(`Publicável: ${d.alegacoes} alegações em 12 meses, ${d.paisesVisiveis} países visíveis, ${saida.grupos.length} perfis de grupo, ${ferramentas.length} ferramentas e ${vulnerabilidades.length} vulnerabilidades.`);

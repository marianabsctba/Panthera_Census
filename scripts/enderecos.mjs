// Atualiza os endereços dos grupos (RansomLook, CC BY 4.0), ativos ou não.
// Sem argumento, revê os grupos ativos em 90 dias. Com --todos, revê todos os grupos.
// A consulta traz capturas de tela e pesa megabytes por grupo: daí a pausa e a varredura completa só uma vez por mês.
// Só o endereço sai daqui. Títulos, publicações e capturas ficam em memória e somem.
// Servidores de arquivos são só contados. Com --arquivos=caminho, a lista deles vai para um arquivo fora do repositório.
import { setDefaultResultOrder } from "node:dns";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lerLocais } from "./texto.mjs";

const API = "https://www.ransomlook.io/api";
const CABECALHOS = { "user-agent": "Panthera Census (github.com/marianabsctba/Panthera_Census)" };
const PAUSA = 2000;
const DESTINO = join(dirname(fileURLToPath(import.meta.url)), "..", "curadoria", "enderecos.json");
const todos = process.argv.includes("--todos");
const destinoArquivos = process.argv.find((a) => a.startsWith("--arquivos="))?.slice(11);

setDefaultResultOrder("ipv4first");

async function obter(caminho) {
  const resposta = await fetch(`${API}${caminho}`, { headers: CABECALHOS, signal: AbortSignal.timeout(180_000) });
  if (!resposta.ok) throw new Error(String(resposta.status));
  return resposta.json();
}

const nomes = todos
  ? (await obter("/groups")).sort()
  : [...new Set((await obter("/posts?days=90")).posts.map((p) => p.group_name))].sort();
console.log(`${nomes.length} grupos para consultar.`);

const anterior = existsSync(DESTINO) ? JSON.parse(readFileSync(DESTINO, "utf8")) : { grupos: {} };
const grupos = { ...anterior.grupos };
const arquivos = {};
let falhas = 0;
for (const nome of nomes) {
  try {
    const [grupo] = await obter(`/group/${encodeURIComponent(nome)}`);
    const lido = lerLocais(grupo?.locations);
    grupos[nome] = { arquivos: lido.arquivos.length, enderecos: lido.enderecos };
    if (lido.arquivos.length) arquivos[nome] = lido.arquivos;
  } catch {
    falhas++; // O grupo fica com o que já tinha.
  }
  await new Promise((r) => setTimeout(r, PAUSA));
}
if (falhas > nomes.length / 2) {
  console.error(`Muitas falhas (${falhas} de ${nomes.length}): a lista anterior foi mantida.`);
  process.exit(1);
}

const ordenado = Object.fromEntries(Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b)));
const saida = { verificado: new Date().toISOString().slice(0, 10), grupos: ordenado };
writeFileSync(DESTINO, `${JSON.stringify(saida).replace(/\]\},/g, "]},\n")}\n`);
if (destinoArquivos) writeFileSync(destinoArquivos, JSON.stringify(arquivos));
console.log(`${Object.keys(ordenado).length} grupos na lista, ${falhas} falhas.`);

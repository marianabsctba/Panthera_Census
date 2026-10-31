// Atualiza, uma vez por semana, os endereços dos sites de vazamento dos grupos ativos (RansomLook, CC BY 4.0).
// A consulta traz capturas de tela e pesa megabytes por grupo: daí a pausa e a frequência baixa.
// Só o endereço sai daqui. Títulos, publicações e capturas ficam em memória e somem.
import { setDefaultResultOrder } from "node:dns";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enderecosDoGrupo } from "./texto.mjs";

const API = "https://www.ransomlook.io/api";
const CABECALHOS = { "user-agent": "Panthera Census (github.com/marianabsctba/Panthera_Census)" };
const PAUSA = 2000;
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

setDefaultResultOrder("ipv4first");

async function obter(caminho) {
  const resposta = await fetch(`${API}${caminho}`, { headers: CABECALHOS, signal: AbortSignal.timeout(180_000) });
  if (!resposta.ok) throw new Error(String(resposta.status));
  return resposta.json();
}

const { posts } = await obter("/posts?days=90");
const ativos = [...new Set(posts.map((p) => p.group_name))].sort();
console.log(`${ativos.length} grupos ativos em 90 dias.`);

const grupos = {};
let falhas = 0;
for (const nome of ativos) {
  try {
    const [grupo] = await obter(`/group/${encodeURIComponent(nome)}`);
    const enderecos = enderecosDoGrupo(grupo?.locations);
    if (enderecos.length) grupos[nome] = enderecos;
  } catch {
    falhas++;
  }
  await new Promise((r) => setTimeout(r, PAUSA));
}
// Falha geral não pode apagar a lista da semana anterior.
if (falhas > ativos.length / 2) {
  console.error(`Muitas falhas (${falhas} de ${ativos.length}): a lista anterior foi mantida.`);
  process.exit(1);
}

const saida = { verificado: new Date().toISOString().slice(0, 10), grupos };
writeFileSync(join(raiz, "curadoria", "enderecos.json"), `${JSON.stringify(saida, null, 0).replace(/\],/g, "],\n")}\n`);
console.log(`${Object.keys(grupos).length} grupos com site no ar, ${falhas} falhas.`);

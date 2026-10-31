// Atualiza população e PIB por país (Banco Mundial, CC BY 4.0). Roda à mão: esses números mudam pouco.
import { setDefaultResultOrder } from "node:dns";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

setDefaultResultOrder("ipv4first");
const INDICADORES = { populacao: "SP.POP.TOTL", pib: "NY.GDP.MKTP.CD" };

async function indicador(codigo) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${codigo}?format=json&per_page=20000&mrnev=1`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`Banco Mundial respondeu ${resposta.status}`);
  const [, linhas] = await resposta.json();
  return linhas;
}

const saida = {};
let ano = "";
for (const [campo, codigo] of Object.entries(INDICADORES)) {
  for (const l of await indicador(codigo)) {
    if (!/^[A-Z]{2}$/.test(l.country.id) || l.value == null || !l.countryiso3code) continue;
    saida[l.country.id] ??= {};
    saida[l.country.id][campo] = Math.round(l.value);
    if (l.date > ano) ano = l.date;
  }
}
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const ordenado = Object.fromEntries(Object.entries(saida).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(raiz, "curadoria", "referencias.json"), `${JSON.stringify({ ano, paises: ordenado }, null, 0).replace(/},/g, "},\n")}\n`);
console.log(`${Object.keys(ordenado).length} países, até ${ano}.`);

// Converte a planilha de revisão, que tem nomes e fica fora do repositório, em códigos opacos.
// Uso: CENSUS_SEGREDO=... npm run curadoria -- caminho/da/revisao.json
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chaveOpaca } from "./agregar.mjs";
import { validarCorrecoes } from "./trava.mjs";

const caminho = process.argv[2];
const segredo = process.env.CENSUS_SEGREDO;
if (!caminho || !segredo) {
  console.error("Informe o caminho da revisão e o CENSUS_SEGREDO.");
  process.exit(1);
}

const correcoes = {};
for (const linha of JSON.parse(readFileSync(caminho, "utf8"))) {
  const item = { acao: linha.acao };
  if (linha.acao === "setor") item.setor = linha.setor;
  correcoes[chaveOpaca(segredo, linha)] = item;
}
const erros = validarCorrecoes(correcoes);
if (erros.length) {
  console.error(erros.join("\n"));
  process.exit(1);
}
// Ordem pelo código, para o arquivo não entregar a ordem original da planilha.
const ordenado = Object.fromEntries(Object.entries(correcoes).sort(([a], [b]) => a.localeCompare(b)));
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
writeFileSync(join(raiz, "curadoria", "correcoes.json"), `${JSON.stringify(ordenado, null, 0).replace(/},/g, "},\n")}\n`);
console.log(`${Object.keys(ordenado).length} casos na curadoria.`);

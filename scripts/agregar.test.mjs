import { describe, expect, it } from "vitest";
import { agregar, chaveOpaca, inicioDoPeriodo, semPequenos, wilson } from "./agregar.mjs";
import { dominioNoTexto, validarCorrecoes, validarFonte, validarSaida } from "./trava.mjs";

// Só nomes inventados: dado real de vítima não entra nos testes.
const registro = (titulo, pais, grupo = "grupo-a", activity = "Technology", discovered = "2026-06-10 10:00:00") => ({
  post_title: titulo,
  country: pais,
  group_name: grupo,
  activity,
  discovered,
});
const pais = { nome: (cc) => ({ BR: "Brasil", US: "Estados Unidos" })[cc], numerico: (cc) => ({ BR: "076", US: "840" })[cc] };
const anpd = { atualizado: "2026-10-31", total: 1, ransomware: 1, anos: [] };

function base() {
  const lista = [];
  for (let i = 0; i < 6; i++) lista.push(registro(`Empresa Ficticia BR ${i}`, "BR"));
  for (let i = 0; i < 2; i++) lista.push(registro(`Empresa Rara ${i}`, "BR", "grupo-b", "Hospitality"));
  for (let i = 0; i < 5; i++) lista.push(registro(`Empresa Ficticia US ${i}`, "US", "grupo-a", "Healthcare"));
  lista.push(registro("Empresa Solitaria", "AR"));
  return lista;
}

describe("agregar", () => {
  it("soma sem nunca carregar o nome de uma vítima", () => {
    const saida = agregar({ registros: base(), correcoes: {}, chave: null, pais, anpd });
    expect(JSON.stringify(saida)).not.toMatch(/Empresa/);
  });

  it("esconde país com menos de 3 casos", () => {
    const saida = agregar({ registros: base(), correcoes: {}, chave: null, pais, anpd });
    expect(saida.paises.map((p) => p.cc)).toEqual(["BR", "US"]);
    expect(saida.doze.paises).toBe(3);
  });

  it("aplica a curadoria só por código opaco", () => {
    const registros = base();
    const segredo = "segredo-de-teste";
    const chave = (r) => chaveOpaca(segredo, r);
    const correcoes = {
      [chave(registros[0])]: { acao: "estrangeiro" },
      [chave(registros[1])]: { acao: "duplicata" },
      [chave(registros[2])]: { acao: "setor", setor: "Construção" },
      [chave(registros[3])]: { acao: "ok" },
    };
    const saida = agregar({ registros, correcoes, chave, pais, anpd });
    expect(saida.brasil).toMatchObject({ fonte: 8, final: 6, revisados: 4, pendentes: 4, estrangeiros: 1, duplicatas: 1, setoresCorrigidos: 1 });
  });

  it("sem o segredo, o Brasil sai como veio da fonte", () => {
    const saida = agregar({ registros: base(), correcoes: { x: { acao: "estrangeiro" } }, chave: null, pais, anpd });
    expect(saida.brasil).toMatchObject({ fonte: 8, final: 8, revisados: 0, pendentes: 8 });
  });

  it("calcula o início do período de 12 meses", () => {
    expect(inicioDoPeriodo("2026-10-31")).toBe("2025-11-01");
  });
});

describe("recortes pequenos", () => {
  it("soma os pequenos e some com a soma se ela ainda for pequena", () => {
    expect(semPequenos(new Map([["a", 5], ["b", 1], ["c", 2]]))).toEqual([["a", 5], ["Outros recortes", 3]]);
    expect(semPequenos(new Map([["a", 5], ["b", 1]]))).toEqual([["a", 5]]);
  });
});

describe("margem de Wilson", () => {
  it("bate com o valor de referência", () => {
    expect(wilson(15, 219)).toEqual([4.2, 11]);
    expect(wilson(0, 0)).toEqual([0, 0]);
  });
});

describe("trava", () => {
  const permitidos = { grupos: new Set(["grupo-a", "grupo-b"]), paises: new Set(["Brasil", "Estados Unidos"]) };
  const limpa = () => agregar({ registros: base(), correcoes: {}, chave: null, pais, anpd });

  it("deixa passar a saída limpa", () => {
    expect(validarSaida(limpa(), permitidos)).toEqual([]);
  });

  it("barra qualquer texto que não seja grupo, país, setor ou data", () => {
    const saida = limpa();
    saida.grupos.mundo.push(["Empresa Ficticia BR 0", 9]);
    expect(validarSaida(saida, permitidos).length).toBeGreaterThan(0);
  });

  it("barra recorte pequeno", () => {
    const saida = limpa();
    saida.paises[0].setores.push(["Saúde", 1]);
    expect(validarSaida(saida, permitidos)).toContain("recorte abaixo de 3 em BR");
  });

  it("barra correção com nome em vez de código opaco", () => {
    expect(validarCorrecoes({ "Empresa Ficticia": { acao: "ok" } }).length).toBeGreaterThan(0);
    expect(validarCorrecoes({ ["a".repeat(64)]: { acao: "ok", nota: "Empresa Ficticia" } }).length).toBeGreaterThan(0);
    expect(validarCorrecoes({ ["a".repeat(64)]: { acao: "setor", setor: "Agro e alimentos" } })).toEqual([]);
  });

  it("acha domínio de vítima em arquivo versionado", () => {
    const dominios = new Set(["empresa-ficticia.example"]);
    expect(dominioNoTexto("veja https://www.Empresa-Ficticia.example/x", dominios)).toHaveLength(1);
    expect(dominioNoTexto("sem nada aqui", dominios)).toHaveLength(0);
  });

  it("barra fonte cortada ou com queda brusca", () => {
    expect(validarFonte([], 0)).toContain("a fonte veio cortada");
    const grande = Array.from({ length: 30000 }, () => registro("x", "BR"));
    expect(validarFonte(grande, 40000)).toContain("a fonte caiu mais de 10%");
    expect(validarFonte(grande, 31000)).toEqual([]);
  });
});

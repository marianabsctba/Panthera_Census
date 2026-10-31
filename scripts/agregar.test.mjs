import { describe, expect, it } from "vitest";
import { agregar, chaveOpaca, inicioDoPeriodo, semPequenos, wilson } from "./agregar.mjs";
import {
  faixaAtraso, faixaFaturamento, faixaFuncionarios, faixaVolume, faturamentoEmDolar, funcionarios,
  grupoSinalizado, lerFerramentas, lerVulnerabilidades, nomeDeGrupo, volumeEmGb,
} from "./texto.mjs";
import { dominioNoTexto, validarCorrecoes, validarFonte, validarSaida } from "./trava.mjs";

// Só nomes inventados: dado real de vítima não entra nos testes.
const registro = (titulo, pais, grupo = "grupo-a", activity = "Technology", discovered = "2026-06-10 10:00:00") => ({
  post_title: titulo,
  country: pais,
  group_name: grupo,
  activity,
  discovered,
  published: discovered,
});
const pais = { nome: (cc) => ({ BR: "Brasil", US: "Estados Unidos", AR: "Argentina" })[cc], numerico: (cc) => ({ BR: "076", US: "840", AR: "032" })[cc] };
const anpd = { atualizado: "2026-10-31", total: 1, ransomware: 1, anos: [] };
const doze = (saida) => saida.periodos["12m"];

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
    const p = doze(agregar({ registros: base(), correcoes: {}, chave: null, pais, anpd }));
    expect(p.paises.map((x) => x.cc)).toEqual(["BR", "US"]);
    expect(p.paisesCitados).toBe(3);
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
    expect(doze(saida).brasil).toMatchObject({ fonte: 8, final: 6, revisados: 4, pendentes: 4, estrangeiros: 1, duplicatas: 1, setoresCorrigidos: 1 });
  });

  it("sem o segredo, o Brasil sai como veio da fonte", () => {
    const saida = agregar({ registros: base(), correcoes: { x: { acao: "estrangeiro" } }, chave: null, pais, anpd });
    expect(doze(saida).brasil).toMatchObject({ fonte: 8, final: 8, revisados: 0, pendentes: 8 });
  });

  it("calcula o início do período de 12 meses", () => {
    expect(inicioDoPeriodo("2026-10-31")).toBe("2025-11-01");
  });

  it("gera um arquivo por período e o histórico inteiro", () => {
    const saida = agregar({ registros: base(), correcoes: {}, chave: null, pais, anpd });
    expect(Object.keys(saida.periodos).sort()).toEqual(["12m", "2026", "tudo"]);
  });

  it("calcula por habitante e por PIB e deixa país minúsculo fora", () => {
    const referencias = { BR: { populacao: 200_000_000, pib: 2e12 }, US: { populacao: 500_000, pib: 1e12 } };
    const p = doze(agregar({ registros: base(), correcoes: {}, chave: null, pais, anpd, referencias }));
    const br = p.paises.find((x) => x.cc === "BR");
    expect(br.porMilhao).toBe(0);
    expect(br.porPib).toBe(0.4);
    expect(p.paises.find((x) => x.cc === "US").porMilhao).toBeNull();
  });

  it("publica faixas de texto sem o texto", () => {
    const lista = Array.from({ length: 4 }, (_, i) => ({
      ...registro(`Empresa Texto ${i}`, "BR"),
      description: "Revenue: $20 Million. 50 GB. Employees: 100. NOT PAID. payroll",
      published: "2026-06-01 10:00:00",
    }));
    const t = doze(agregar({ registros: lista, correcoes: {}, chave: null, pais, anpd }));
    expect(t.textos.faturamento.faixas).toEqual([["US$ 10 a 50 mi", 4]]);
    expect(t.textos.volume.faixas).toEqual([["10 a 100 GB", 4]]);
    expect(t.textos.situacao.faixas).toEqual([["Não pagou", 4]]);
    expect(t.tempo.atraso).toEqual([["8 a 30 dias", 4]]);
    expect(JSON.stringify(t)).not.toMatch(/Revenue|Empresa/);
  });

  it("gera o perfil do grupo sem endereços nem nomes de vítimas", () => {
    const gruposFonte = [{
      name: "grupo-a", altname: "", lineage: null, type: { raas: true }, description: "The group appears unreliable.",
      locations: [{ fqdn: "exemplo.onion", available: true }, { fqdn: "outro.onion", available: false }],
    }];
    const matrizes = { ferramentas: [{ categoria: "Exfiltração", nome: "RClone", grupos: ["Grupo A"] }], vulnerabilidades: [] };
    const saida = agregar({ registros: base(), correcoes: {}, chave: null, pais, anpd, gruposFonte, matrizes });
    const g = saida.grupos.find((x) => x.nome === "grupo-a");
    expect(g).toMatchObject({ raas: true, sinalizado: true, sites: 2, sitesNoAr: 1, outroNome: null });
    expect(g.ferramentas).toEqual([["Exfiltração", "RClone"]]);
    expect(JSON.stringify(saida)).not.toMatch(/Empresa|\.onion/);
    expect(saida.resumo.tipos.raas).toBe(1);
    expect(g.nomeRansomLook).toBeNull();
  });

  it("liga o grupo à ficha externa e filtra os relatórios", () => {
    const gruposFonte = [{ name: "grupo-a", profile: ["[Relatório](https://www.cisa.gov/aviso-1)", "http://abc.onion/x", "https://site-qualquer.example/x"] }];
    const saida = agregar({ registros: base(), correcoes: {}, chave: null, pais, anpd, gruposFonte, gruposRansomLook: ["Grupo A"] });
    const g = saida.grupos.find((x) => x.nome === "grupo-a");
    expect(g.nomeRansomLook).toBe("Grupo A");
    expect(g.referencias).toEqual(["https://www.cisa.gov/aviso-1"]);
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
    const [baixo, alto] = wilson(15, 219);
    expect(baixo).toBeCloseTo(4.2, 1);
    expect(alto).toBeCloseTo(11, 0);
    expect(wilson(0, 0)).toEqual([0, 0]);
  });
});

describe("leitura dos textos", () => {
  it("entende volume, faturamento e funcionários", () => {
    expect(volumeEmGb("Total leak: 1.53 TB, 3.619.372 Files")).toBeCloseTo(1566.72, 1);
    expect(volumeEmGb("847 GB (871,912 Files)")).toBe(847);
    expect(volumeEmGb("sem tamanho")).toBeNull();
    expect(faturamentoEmDolar("Revenue: $197 Million")).toBe(197e6);
    expect(faturamentoEmDolar("Revenue: $7,600,000")).toBe(7.6e6);
    expect(funcionarios("Employees: 10.000 - 20.000")).toBe(10000);
    expect(funcionarios("Employees: 51-200")).toBe(51);
  });

  it("põe cada valor na faixa certa", () => {
    expect(faixaVolume(5)).toBe("Até 10 GB");
    expect(faixaVolume(2000)).toBe("Mais de 1 TB");
    expect(faixaFaturamento(2e9)).toBe("Mais de US$ 1 bi");
    expect(faixaFuncionarios(600)).toBe("201 a 1.000");
    expect(faixaAtraso(0.2)).toBe("No mesmo dia");
    expect(faixaAtraso(40)).toBe("31 a 90 dias");
  });

  it("não confunde história do grupo com aviso da fonte", () => {
    expect(grupoSinalizado("The group appears unreliable.")).toBe(true);
    expect(grupoSinalizado("This is a fake group with fake victims.")).toBe(true);
    expect(grupoSinalizado("It ended with an exit scam in 2023.")).toBe(false);
  });

  it("lê as tabelas das matrizes e ignora cabeçalhos", () => {
    const f = lerFerramentas("Exfiltração", "| Tool Name | Threat Group Usage |\n|---|---|\n| RClone | Akira, LockBit* |");
    expect(f).toEqual([{ categoria: "Exfiltração", nome: "RClone", grupos: ["Akira", "LockBit"] }]);
    const v = lerVulnerabilidades("Borda", "| Product | CVE(s) | Ransomware Group(s) | Source(s) |\n|---|---|---|---|\n| VPN X | CVE-2024-1111 / CVE-2024-2222 | Qilin+ | fonte |");
    expect(v.map((x) => x.cve)).toEqual(["CVE-2024-1111", "CVE-2024-2222"]);
    expect(v[0].grupos).toEqual(["Qilin"]);
  });

  it("casa o grupo da fonte com o da matriz", () => {
    expect(nomeDeGrupo("lockbit5")).toBe(nomeDeGrupo("LockBit"));
    expect(nomeDeGrupo("incransom")).toBe(nomeDeGrupo("INC Ransom"));
  });
});

describe("trava", () => {
  const permitidos = { grupos: new Set(["grupo-a", "grupo-b"]), paises: new Set(["Brasil", "Estados Unidos", "Argentina"]) };
  const limpa = () => agregar({ registros: base(), correcoes: {}, chave: null, pais, anpd });

  it("deixa passar a saída limpa", () => {
    expect(validarSaida(limpa(), permitidos)).toEqual([]);
  });

  it("barra qualquer texto que não seja autorizado", () => {
    const saida = limpa();
    doze(saida).grupos.mundo.push(["Empresa Ficticia BR 0", 9]);
    expect(validarSaida(saida, permitidos).length).toBeGreaterThan(0);
  });

  it("barra recorte pequeno", () => {
    const saida = limpa();
    doze(saida).paises[0].setores.push(["Saúde", 1]);
    expect(validarSaida(saida, permitidos)).toContain("recorte abaixo de 3 em 12m/BR");
  });

  it("barra faixa pequena nos textos e nos perfis", () => {
    const saida = limpa();
    doze(saida).textos.volume.faixas.push(["Até 10 GB", 1]);
    expect(validarSaida(saida, permitidos).length).toBeGreaterThan(0);
    const outra = limpa();
    outra.grupos[0].paises.push(["Brasil", 1]);
    expect(validarSaida(outra, permitidos)).toContain("recorte abaixo de 3 em perfil de grupo");
  });

  it("só aceita relatório de fonte conhecida, nunca endereço de grupo", () => {
    const comLink = (url) => {
      const saida = limpa();
      saida.grupos[0].referencias = [url];
      return validarSaida(saida, permitidos);
    };
    expect(comLink("https://www.cisa.gov/news-events/aviso")).toEqual([]);
    expect(comLink("http://abc123.onion/vazamentos").length).toBeGreaterThan(0);
    expect(comLink("https://cisa.gov.exemplo.onion/x").length).toBeGreaterThan(0);
    expect(comLink("https://site-qualquer.example/x").length).toBeGreaterThan(0);
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

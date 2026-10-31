import { describe, expect, it } from "vitest";
import { data, intensidade, marcasDoEixo, nomeDoMes, porcento } from "./formato";

describe("formato", () => {
  it("escreve em português", () => {
    expect(nomeDoMes("2026-03")).toBe("mar/26");
    expect(data("2026-10-31")).toBe("31/10/2026");
    expect(porcento(6.8)).toBe("6,8%");
  });

  it("gera marcas redondas que cobrem o máximo", () => {
    const marcas = marcasDoEixo(1190);
    expect(marcas[0]).toBe(0);
    expect(marcas.at(-1)).toBeGreaterThanOrEqual(1190);
    expect(marcas).toContain(500);
  });

  it("mantém a intensidade do mapa entre 0 e 1", () => {
    expect(intensidade(3, 4107)).toBe(0);
    expect(intensidade(4107, 4107)).toBe(1);
    expect(intensidade(219, 4107)).toBeGreaterThan(0.5);
  });
});

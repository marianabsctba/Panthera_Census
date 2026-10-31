export type Contagem = [string, number];

export interface Pais {
  cc: string;
  num: string | null;
  nome: string;
  n: number;
  setores: Contagem[];
  grupos: Contagem[];
  trimestres: Contagem[];
}

export interface LinhaSetor {
  setor: string;
  n: number;
  mundo: number | null;
  fonte: number;
  revisado: number;
  margem: [number, number];
}

export interface Mes {
  mes: string;
  mundo: number;
  brasil: number;
}

export interface AnoAnpd {
  ano: string;
  incidentes: number;
  ransomware: number | null;
}

export interface Census {
  periodo: { inicio: string; fim: string };
  total: number;
  gruposNaBase: number;
  doze: { alegacoes: number; comPais: number; paises: number; paisesVisiveis: number; grupos: number };
  brasil: {
    fonte: number;
    final: number;
    revisados: number;
    pendentes: number;
    estrangeiros: number;
    duplicatas: number;
    setoresCorrigidos: number;
    posicao: number;
  };
  meses: Mes[];
  paises: Pais[];
  setores: LinhaSetor[];
  grupos: { mundo: Contagem[]; brasil: Contagem[] };
  anpd: { atualizado: string; total: number; ransomware: number; anos: AnoAnpd[] };
}

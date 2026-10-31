export type Contagem = [string, number];

export interface Pais {
  cc: string;
  num: string | null;
  nome: string;
  n: number;
  porMilhao: number | null;
  porPib: number | null;
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

export interface BlocoDeFaixas {
  n: number;
  faixas: Contagem[];
}

export interface Periodo {
  alegacoes: number;
  comPais: number;
  paisesCitados: number;
  paisesVisiveis: number;
  gruposAtivos: number;
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
  paises: Pais[];
  mapaSetor: Record<string, Contagem[]>;
  setores: LinhaSetor[];
  grupos: { mundo: Contagem[]; brasil: Contagem[] };
  tempo: { atraso: Contagem[]; semana: Contagem[] };
  textos: {
    comTexto: number;
    volume: BlocoDeFaixas;
    faturamento: BlocoDeFaixas;
    funcionarios: BlocoDeFaixas;
    dados: Contagem[];
    situacao: BlocoDeFaixas;
    comPrazo: number;
  };
}

export interface Mes {
  mes: string;
  mundo: number;
  brasil: number;
}

export interface RecorteAnpd {
  nome: string;
  total: number;
  ransomware: number;
  comTransferencia: number;
  semTransferencia: number;
  sensiveis: number | null;
}

export interface Anpd {
  atualizado: string;
  total: number;
  ransomware: number;
  anos: { ano: string; incidentes: number; ransomware: number | null }[];
  tipos: Contagem[];
  segmentos: RecorteAnpd[];
  setores: RecorteAnpd[];
  estados: RecorteAnpd[];
  sensiveis: Contagem[];
  processos: Contagem[];
  ultimoAno: { ano: string; comunicacao: Contagem[]; impacto: Contagem[]; criancas: Contagem[]; titulares: Contagem[] } | null;
}

export interface Resumo {
  periodo: { inicio: string; fim: string };
  total: number;
  gruposNaBase: number;
  anosDisponiveis: string[];
  meses: Mes[];
  gruposNovos: Contagem[];
  tipos: { raas: number; comLinhagem: number; sinalizados: number; comSiteNoAr: number; total: number };
  ecossistema: { grupos: number; gruposNoAr: number; sitesDeVazamento: number; mercados: number; mercadosNoAr: number; publicacoes90d: number } | null;
  ferramentas: { nome: string; categoria: string; grupos: number }[];
  vulnerabilidades: { cve: string; produto: string; grupos: number }[];
  totaisMatrizes: { ferramentas: number; vulnerabilidades: number };
  enderecosVerificados: string | null;
  anpd: Anpd;
}

export interface Grupo {
  nome: string;
  raas: boolean;
  linhagem: string | null;
  outroNome: string | null;
  primeira: string;
  ultima: string;
  total: number;
  dozeMeses: number;
  noBrasil: number;
  sites: number;
  sitesNoAr: number;
  sinalizado: boolean;
  apreendido: boolean;
  setores: Contagem[];
  paises: Contagem[];
  anos: Contagem[];
  ferramentas: [string, string][];
  vulnerabilidades: [string, string][];
  nomeRansomLook: string | null;
  referencias: string[];
}

export interface Endereco {
  e: string;
  t: string;
  ar: boolean;
  visto: string | null;
}

export interface EnderecosDoGrupo {
  nome: string;
  arquivos: number;
  enderecos: Endereco[];
}

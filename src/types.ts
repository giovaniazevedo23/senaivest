// TypeScript interfaces for inventory financial module (for reference)
export type ItemStatus = 'ATIVO' | 'QUEBRADO' | 'DESCARTADO';
export type ItemType = 'RETORNAVEL' | 'CONSUMO';

export interface StatusHistoryEntry {
  status: ItemStatus | string;
  date: string; // ISO
}

export interface InventoryItem {
  id: string;
  nome: string;
  tipoItem: ItemType;
  quantidade: number;
  precoMedio?: number | null;
  dataCadastro: string; // ISO
  taxaDepreciacaoMensal?: number | null;
  perdaRealRegistrada?: number | null;
  statusItem: ItemStatus;
  statusHistory?: StatusHistoryEntry[];
}

export interface FinancialsResult {
  months: string[];
  labels: string[];
  series: { custoMercado: number[]; custoEconomizado: number[] };
  cards: { totalEconomizadoAcumulado: number; percMediaEficiencia: number; custoEstimadoAtual: number };
  totals: { totalMercadoAll: number; totalEconomizadoAll: number };
  anyWithPrice: boolean;
}

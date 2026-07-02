import { InventoryItem, FinancialsResult } from './types';

function toMonthKey(dateLike: string): string {
  const d = new Date(dateLike);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function monthsBetween(start: string, end: string): number {
  const s = new Date(start); s.setDate(1);
  const e = new Date(end); e.setDate(1);
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
}

function buildMonthList(startKey: string, endKey: string): string[] {
  const list: string[] = [];
  let [y, m] = startKey.split('-').map(Number);
  const [ey, em] = endKey.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    list.push(`${y}-${String(m).padStart(2,'0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return list;
}

function parseOrZero(v: any): number { return (typeof v === 'number' && !isNaN(v)) ? v : 0; }

export function computeMonthlyFinancialsTS(items: InventoryItem[] = [], options: { fallbackPerda?: number; nowDate?: string; startMonth?: string; endMonth?: string } = {}): FinancialsResult {
  const fallbackPerda = typeof options.fallbackPerda === 'number' ? options.fallbackPerda : 0.4;
  const now = options.nowDate ? new Date(options.nowDate) : new Date();

  const activeItems = (items || []).filter(it => it && (it.statusItem || 'ATIVO') === 'ATIVO');
  const itemMonths = activeItems.map(it => toMonthKey(it.dataCadastro));
  const minMonthKey = options.startMonth || (itemMonths.length ? itemMonths.reduce((a,b) => a < b ? a : b) : toMonthKey(now.toISOString()));
  const endMonthKey = options.endMonth || toMonthKey(now.toISOString());

  const monthList = buildMonthList(minMonthKey, endMonthKey);

  const seriesMercado: number[] = [];
  const seriesEconomizado: number[] = [];
  let totalMercadoAll = 0;
  let totalEconomizadoAll = 0;

  for (const monthKey of monthList) {
    let monthMercado = 0;
    let monthEconomizado = 0;

    for (const it of activeItems) {
      if (typeof it.precoMedio !== 'number') continue;
      const itemMonth = toMonthKey(it.dataCadastro);
      if (itemMonth !== monthKey) continue;

      const qty = parseOrZero(it.quantidade);
      const price = parseOrZero(it.precoMedio);
      const baseValue = qty * price;
      monthMercado += baseValue;

      let blockedAtOrBefore = false;
      if (Array.isArray(it.statusHistory)) {
        for (const h of it.statusHistory) {
          if (!h || !h.status || !h.date) continue;
          const s = String(h.status).toUpperCase();
          if ((s === 'QUEBRADO' || s === 'DESCARTADO')) {
            const hMonth = toMonthKey(h.date);
            if (hMonth <= monthKey) { blockedAtOrBefore = true; break; }
          }
        }
      }

      let econ = 0;
      if (!blockedAtOrBefore) {
        if (String((it.tipoItem || '')).toUpperCase() === 'CONSUMO') {
          const perda = (typeof it.perdaRealRegistrada === 'number') ? Number(it.perdaRealRegistrada) : fallbackPerda;
          const fator = Math.max(0, 1 - perda);
          econ = baseValue * fator;
        } else {
          const taxa = (typeof it.taxaDepreciacaoMensal === 'number') ? Number(it.taxaDepreciacaoMensal) : 0;
          const mesesDecorridos = Math.max(0, monthsBetween(it.dataCadastro, monthKey + '-01'));
          const fator = Math.max(0, 1 - taxa * mesesDecorridos);
          econ = baseValue * fator;
        }
      }

      monthEconomizado += econ;
    }

    seriesMercado.push(monthMercado);
    seriesEconomizado.push(monthEconomizado);
    totalMercadoAll += monthMercado;
    totalEconomizadoAll += monthEconomizado;
  }

  const totalEconomizadoAcumulado = totalEconomizadoAll;
  const percMediaEficiencia = totalMercadoAll > 0 ? (totalEconomizadoAll / totalMercadoAll) * 100 : 0;

  let custoEstimadoAtual = 0;
  for (const it of activeItems) {
    if (typeof it.precoMedio !== 'number') continue;
    const qty = parseOrZero(it.quantidade);
    const price = parseOrZero(it.precoMedio);
    const baseValue = qty * price;

    let blockedNow = false;
    if (Array.isArray(it.statusHistory)) {
      for (const h of it.statusHistory) {
        if (!h || !h.status || !h.date) continue;
        const s = String(h.status).toUpperCase();
        if ((s === 'QUEBRADO' || s === 'DESCARTADO') && new Date(h.date) <= now) { blockedNow = true; break; }
      }
    }
    if (blockedNow) continue;

    if (String((it.tipoItem || '')).toUpperCase() === 'CONSUMO') {
      const perda = (typeof it.perdaRealRegistrada === 'number') ? Number(it.perdaRealRegistrada) : fallbackPerda;
      const fator = Math.max(0, 1 - perda);
      custoEstimadoAtual += baseValue * fator;
    } else {
      const taxa = (typeof it.taxaDepreciacaoMensal === 'number') ? Number(it.taxaDepreciacaoMensal) : 0;
      const mesesDecorridos = Math.max(0, monthsBetween(it.dataCadastro, toMonthKey(now.toISOString()) + '-01'));
      const fator = Math.max(0, 1 - taxa * mesesDecorridos);
      custoEstimadoAtual += baseValue * fator;
    }
  }

  const anyWithPrice = activeItems.some(it => typeof it.precoMedio === 'number');

  return {
    months: monthList,
    labels: monthList.map(m => {
      const [y, mm] = m.split('-').map(Number);
      return new Date(y, mm-1, 1).toLocaleString('pt-BR', { month:'short', year:'numeric' });
    }),
    series: { custoMercado: seriesMercado, custoEconomizado: seriesEconomizado },
    cards: { totalEconomizadoAcumulado, percMediaEficiencia, custoEstimadoAtual },
    totals: { totalMercadoAll, totalEconomizadoAll },
    anyWithPrice
  };
}

// Keep JS interop easily available: export to global if running in node require()
if (typeof module !== 'undefined' && module.exports) {
  // compile-time: this file is for reference; runtime uses src/financials.js
}

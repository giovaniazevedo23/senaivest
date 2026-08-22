const assert = require('assert');
const { computeMonthlyFinancials } = require('../src/financials');
const sample = require('../data/inventory-sample.json');

console.log('Executing financials unit test with sample data...');
const result = computeMonthlyFinancials(sample, { fallbackPerda: 0.4 });

assert(result && result.months && result.series, 'Result shape invalid');
assert(Array.isArray(result.series.custoMercado), 'custoMercado must be array');
assert(Array.isArray(result.series.custoEconomizado), 'custoEconomizado must be array');

console.log('Months:', result.months.join(', '));
console.log('Total Mercado:', result.totals.totalMercadoAll.toFixed(2));
console.log('Total Econ:', result.totals.totalEconomizadoAll.toFixed(2));
console.log('Cards:', result.cards);

console.log('Test passed.');

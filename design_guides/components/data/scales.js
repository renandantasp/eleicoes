// Algoritmo das faixas — igual ao do site atual, com a regra de casas decimais corrigida.
export const RAMPS = {
  red: ['--ag-red-1','--ag-red-2','--ag-red-3','--ag-red-4','--ag-red-5'],
  blue: ['--ag-blue-1','--ag-blue-2','--ag-blue-3','--ag-blue-4','--ag-blue-5'],
  green: ['--ag-green-1','--ag-green-2','--ag-green-3','--ag-green-4','--ag-green-5'],
  amber: ['--ag-amber-1','--ag-amber-2','--ag-amber-3','--ag-amber-4','--ag-amber-5'],
  teal: ['--ag-teal-1','--ag-teal-2','--ag-teal-3','--ag-teal-4','--ag-teal-5'],
};
export const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
export function nice(x) {
  if (!(x > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(x))), m = x / p;
  let best = 1; [1, 2, 2.5, 5, 10].forEach(c => { if (Math.abs(c - m) < Math.abs(best - m)) best = c; });
  return best * p;
}
export function percentile(arr, p) { const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; }
/** values: valores das unidades COM eleitorado (para % de turno, junte 1º e 2º turnos). */
export function buildScale(values, type) {
  if (type === 'div') return { type, step: nice(percentile(values.map(Math.abs), 0.95) / 5) };
  const lo = percentile(values, 0.02), hi = percentile(values, 0.98), step = nice((hi - lo) / 5);
  return { type, step, start: Math.floor(lo / step) * step };
}
/** 0–9 (divergente: 0–4 polo negativo, 5–9 positivo) ou 0–4 (sequencial). */
export function bandOf(v, sc) {
  if (sc.type === 'div') return v >= 0 ? 5 + Math.min(4, Math.floor(v / sc.step)) : 4 - Math.min(4, Math.floor(-v / sc.step));
  return Math.max(0, Math.min(4, Math.floor((v - sc.start) / sc.step)));
}
/** metric: { type, ramp } ou { type:'div', pos:[label, ramp], neg:[label, ramp] } */
export function colorVar(metric, sc, i) {
  if (sc.type === 'div') return i >= 5 ? RAMPS[metric.pos[1]][i - 5] : RAMPS[metric.neg[1]][4 - i];
  return RAMPS[metric.ramp][i];
}
/** casas decimais a partir do passo: 5 → 0, 2,5 → 1, 0,25 → 2 */
export function decimalsFor(step) { for (let d = 0; d < 4; d++) if (Math.abs(Math.round(step * 10 ** d) - step * 10 ** d) < 1e-9) return d; return 3; }
const fmt = (v, d) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
export function legendRows(metric, sc, counts) {
  const d = decimalsFor(sc.step), f = v => fmt(v, d);
  const cell = (i, range) => ({ color: 'var(' + colorVar(metric, sc, i) + ')', count: counts[i], range });
  if (sc.type === 'div') {
    const side = pos => [0, 1, 2, 3, 4].map(j => {
      const i = pos ? 5 + j : 4 - j, a = j * sc.step, b = (j + 1) * sc.step, s = pos ? '+' : '−';
      const range = j === 4 ? (pos ? s + f(a) + ' ou mais' : 'até ' + s + f(a)) : (j === 0 ? '0' : s + f(a)) + ' a ' + s + f(b);
      return cell(i, range);
    });
    return [{ label: '↑ ' + metric.pos[0], cells: side(true) }, { label: '↓ ' + metric.neg[0], cells: side(false) }];
  }
  const c = [1, 2, 3, 4].map(k => sc.start + k * sc.step);
  return [{ label: 'menor → maior', cells: [0, 1, 2, 3, 4].map(j => cell(j, j === 0 ? 'até ' + f(c[0]) : j === 4 ? f(c[3]) + ' ou mais' : f(c[j - 1]) + ' a ' + f(c[j]))) }];
}
/** raio do círculo: área ∝ eleitorado. k = fator do enquadramento (≈ pxPorKm/58, entre .45 e 1.2) */
export const dotRadius = (el, maxEl, k = 1) => (3.5 + 14 * Math.sqrt(el / maxEl)) * k;

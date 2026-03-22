export const MONEDAS_FIAT = new Set(['ARS', 'USD']);
export const MONEDAS_STABLECOIN = new Set(['USDT', 'USD', 'USDC']);

export function esPorPorcentaje(origen: string, destino: string): boolean {
  return MONEDAS_STABLECOIN.has(origen) && MONEDAS_STABLECOIN.has(destino) && origen !== destino;
}

export function derivarTipo(monedaOrigen: string): 'compra' | 'venta' {
  return MONEDAS_FIAT.has(monedaOrigen) ? 'compra' : 'venta';
}

export function formatTasaDisplay(
  tasaCambio: number | null,
  monedaOrigen: string,
  monedaDestino: string | null,
): string {
  if (tasaCambio === null) return '—';
  if (monedaDestino && esPorPorcentaje(monedaOrigen, monedaDestino)) {
    const pct = (tasaCambio - 1) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(4).replace(/\.?0+$/, '')}%`;
  }
  return tasaCambio.toLocaleString('es-AR');
}

export function parseMoney(str: string): number {
  if (!str) return 0;
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str.replace(/[^\d.]/g, '')) || 0;
}

export function nowHora(): string {
  return new Date().toTimeString().slice(0, 5);
}

// Devuelve la fecha local de hoy en formato YYYY-MM-DD.
// No usar new Date().toISOString() porque retorna UTC y en Argentina
// (UTC-3) de noche muestra el día siguiente.
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatMonto(amount: number, moneda: string): string {
  if (moneda === 'USDT' || moneda === 'USD') {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })
      .format(amount)
      .replace('US$', moneda === 'USDT' ? 'USDT' : 'USD');
  }
  if (moneda === 'ARS') {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  // Moneda dinámica desconocida: mostrar con 8 decimales
  return `${amount.toFixed(8)} ${moneda}`;
}

// Parsea una fecha sin desplazamiento de timezone.
// 'YYYY-MM-DD' se interpreta como UTC midnight por el estándar, lo que
// en UTC-3 muestra el día anterior. Extraemos las partes y construimos
// una fecha local para evitar ese corrimiento.
function parseDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr;
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parseDate(dateStr));
}

export function formatTasa(valor: number, tipo: 'porcentaje' | 'fijo', moneda?: string): string {
  if (tipo === 'porcentaje') return `${valor}%`;
  return moneda ? formatMonto(valor, moneda) : `${valor}`;
}

export function diasHastaVencimiento(fechaVencimiento: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = parseDate(fechaVencimiento);
  fecha.setHours(0, 0, 0, 0);
  return Math.round((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

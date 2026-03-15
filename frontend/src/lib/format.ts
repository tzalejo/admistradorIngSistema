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

export function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

export function formatTasa(valor: number, tipo: 'porcentaje' | 'fijo', moneda?: string): string {
  if (tipo === 'porcentaje') return `${valor}%`;
  return moneda ? formatMonto(valor, moneda) : `${valor}`;
}

export function diasHastaVencimiento(fechaVencimiento: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaVencimiento);
  fecha.setHours(0, 0, 0, 0);
  return Math.round((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

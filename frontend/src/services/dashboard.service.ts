import { api } from './api';
import type { ResumenDashboard, Movimiento } from '@/types';

export const dashboardService = {
  getResumen: () => api.get<ResumenDashboard>('/dashboard/resumen'),
  getMovimientos: () => api.get<Movimiento[]>('/dashboard/movimientos'),
  getGanancia: (prestamoId: string) =>
    api.get<{
      prestamoId: string;
      cliente: string;
      moneda: string;
      montoInicial: number;
      gananciaTradingPorMoneda: Record<string, number>;
      costoInteresesPagados: Record<string, number>;
      operaciones: number;
    }>(`/dashboard/ganancia/${prestamoId}`),
};

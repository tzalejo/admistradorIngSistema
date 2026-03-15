import { api } from './api';
import type { ResumenDashboard, Movimiento } from '@/types';

export const dashboardService = {
  getResumen: () => api.get<ResumenDashboard>('/dashboard/resumen'),
  getMovimientos: () => api.get<Movimiento[]>('/dashboard/movimientos'),
  getCaja: () => api.get<Record<string, number>>('/dashboard/caja'),
};

import { api } from './api';
import type { CierreCaja } from '@/types';

export const cierreCajaService = {
  cerrar: () => api.post<CierreCaja[]>('/cierre-caja', {}),
  getHistorial: () => api.get<CierreCaja[]>('/cierre-caja'),
};

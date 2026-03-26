import { api } from './api';
import type {
  Prestamo,
  CuotaInteres,
  CreatePrestamoDto,
  UpdatePrestamoDto,
  UpdateCuotaDto,
  ResumenPrestamo,
} from '@/types';

export const prestamosService = {
  getAll: () => api.get<Prestamo[]>('/prestamos'),
  getOne: (id: number | string) => api.get<Prestamo>(`/prestamos/${id}`),
  getResumen: (id: number | string) => api.get<ResumenPrestamo>(`/prestamos/${id}/resumen`),
  getCuotas: (id: number | string) => api.get<CuotaInteres[]>(`/prestamos/${id}/cuotas`),

  create: (data: CreatePrestamoDto) => api.post<Prestamo>('/prestamos', data),

  update: (id: number | string, data: UpdatePrestamoDto) =>
    api.patch<Prestamo>(`/prestamos/${id}`, data),

  updateCuota: (cuotaId: number | string, data: UpdateCuotaDto) =>
    api.patch<CuotaInteres>(`/prestamos/cuotas/${cuotaId}`, data),

  delete: (id: number | string) => api.delete<void>(`/prestamos/${id}`),
};

import { api } from './api';
import type {
  Prestamo,
  CuotaInteres,
  PagoCuota,
  CreatePrestamoDto,
  UpdatePrestamoDto,
  UpdateCuotaDto,
  PagarCuotaDto,
  PagarCuotaResponse,
  UpdatePagoCuotaDto,
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

  pagarCuota: (cuotaId: number | string, data: PagarCuotaDto) =>
    api.post<PagarCuotaResponse>(`/prestamos/cuotas/${cuotaId}/pagar`, data),

  // Pagos individuales
  getPagosByCuota: (cuotaId: number | string) =>
    api.get<PagoCuota[]>(`/prestamos/cuotas/${cuotaId}/pagos`),

  updatePago: (pagoId: number | string, data: UpdatePagoCuotaDto) =>
    api.patch<PagoCuota>(`/prestamos/pagos/${pagoId}`, data),

  deletePago: (pagoId: number | string) =>
    api.delete<void>(`/prestamos/pagos/${pagoId}`),

  delete: (id: number | string) => api.delete<void>(`/prestamos/${id}`),
};

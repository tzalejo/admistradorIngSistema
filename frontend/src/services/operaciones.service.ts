import { api } from './api';
import type { Operacion, CreateOperacionDto } from '@/types';

export interface UpdateOperacionDto extends Partial<CreateOperacionDto> {}

export const operacionesService = {
  getAll: () => api.get<Operacion[]>('/operaciones'),
  getOne: (id: number) => api.get<Operacion>(`/operaciones/${id}`),
  create: (data: CreateOperacionDto) => api.post<Operacion>('/operaciones', data),
  update: (id: number, data: UpdateOperacionDto) =>
    api.patch<Operacion>(`/operaciones/${id}`, data),
  delete: (id: number) => api.delete<void>(`/operaciones/${id}`),
};

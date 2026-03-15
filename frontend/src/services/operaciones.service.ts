import { api } from './api';
import type { Operacion, CreateOperacionDto } from '@/types';

export interface UpdateOperacionDto extends Partial<CreateOperacionDto> {}

export const operacionesService = {
  getAll: () => api.get<Operacion[]>('/operaciones'),
  getOne: (id: string) => api.get<Operacion>(`/operaciones/${id}`),
  create: (data: CreateOperacionDto) => api.post<Operacion>('/operaciones', data),
  update: (id: string, data: UpdateOperacionDto) =>
    api.patch<Operacion>(`/operaciones/${id}`, data),
  delete: (id: string) => api.delete<void>(`/operaciones/${id}`),
};

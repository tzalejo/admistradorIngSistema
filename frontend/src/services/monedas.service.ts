import { api } from './api';

export interface MonedaItem {
  codigo: string;
  nombre: string;
  orden: number;
}

export const monedasService = {
  getAll: () => api.get<MonedaItem[]>('/monedas'),
};

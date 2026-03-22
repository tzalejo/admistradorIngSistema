import { api } from './api';

export interface MonedaItem {
  id: number;
  codigo: string;
  nombre: string;
}

export const monedasService = {
  getAll: () => api.get<MonedaItem[]>('/monedas'),
};

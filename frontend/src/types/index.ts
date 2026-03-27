export type Moneda = string;
export type TasaTipo = 'porcentaje' | 'fijo';
export type EstadoPrestamo = 'activo' | 'devuelto' | 'vencido';
export type EstadoCuota = 'pendiente' | 'parcial' | 'pagado';
export type TipoOperacion = 'compra' | 'venta' | 'gasto' | 'ingreso';

export interface CuotaInteres {
  id: number;
  prestamoId: number;
  mesNumero: number;
  tasaAplicada: number;
  montoPago: number;
  montoPagado: number;
  fechaVencimiento: string;
  fechaPagoReal: string | null;
  estado: EstadoCuota;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Prestamo {
  id: number;
  cliente: string;
  montoInicial: number;
  moneda: Moneda;
  fechaInicio: string;
  hora: string;
  plazoMeses: number;
  tasaTipo: TasaTipo;
  tasaInicial: number;
  estado: EstadoPrestamo;
  fechaDevolucion: string | null;
  notas: string | null;
  cuotas: CuotaInteres[];
  createdAt: string;
  updatedAt: string;
}

export interface Operacion {
  id: number;
  tipo: TipoOperacion;
  monedaOrigen: Moneda;
  monedaDestino: Moneda | null;
  montoOrigen: number;
  tasaCambio: number | null;
  montoDestino: number | null;
  fecha: string;
  hora: string;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Movimiento {
  id: number;
  fecha: string;
  hora?: string;
  descripcion: string;
  tipo: 'ingreso' | 'egreso' | 'compra' | 'venta' | 'pago_interes' | 'devolucion' | 'gasto' | 'ingreso_efectivo';
  moneda: Moneda;
  debe: number | null;
  haber: number | null;
  referenciaTipo: 'prestamo' | 'cuota' | 'operacion';
  referenciaId: number;
  cliente?: string;
}

export interface ResumenDashboard {
  prestamosActivos: number;
  capitalTotalPorMoneda: Record<Moneda, number>;
  interesesPendientesPorMoneda: Record<Moneda, number>;
  interesesPagadosPorMoneda: Record<Moneda, number>;
  operacionesTotales: number;
  proximasCuotas: Array<{
    cuotaId: number;
    prestamoId: number;
    cliente: string;
    mesNumero: number;
    montoPago: number;
    moneda: Moneda;
    fechaVencimiento: string;
  }>;
}

export interface CierreCaja {
  id: number;
  fecha: string;
  idMoneda: number;
  moneda: { id: number; codigo: string; nombre: string };
  saldo: number;
  entrada: number;
  salida: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResumenPrestamo {
  prestamo: Prestamo;
  totalInteresGenerado: number;
  totalInteresPagado: number;
  totalInteresPendiente: number;
  cuotasPagadas: number;
  cuotasPendientes: number;
  proximaCuota: CuotaInteres | null;
}

// DTOs para crear
export interface CreatePrestamoDto {
  cliente: string;
  montoInicial: number;
  moneda: Moneda;
  fechaInicio: string;
  hora?: string;
  plazoMeses: number;
  tasaTipo: TasaTipo;
  tasaInicial: number;
  notas?: string;
}

export interface CreateOperacionDto {
  tipo: TipoOperacion;
  monedaOrigen: Moneda;
  monedaDestino?: Moneda;
  montoOrigen: number;
  tasaCambio?: number;
  montoDestino?: number;
  fecha: string;
  hora: string;
  notas?: string;
}

export interface UpdateCuotaDto {
  tasaAplicada?: number;
  montoPago?: number;
  fechaVencimiento?: string;
  fechaPagoReal?: string;
  estado?: EstadoCuota;
  notas?: string;
}

export interface PagarCuotaDto {
  monto: number;
  fechaPago: string;
}

export interface PagoCuota {
  id: number;
  cuotaId: number;
  monto: number;
  fechaPago: string;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PagarCuotaResponse {
  pagos: PagoCuota[];
}

export interface UpdatePagoCuotaDto {
  monto?: number;
  fechaPago?: string;
  notas?: string;
}

export interface UpdatePrestamoDto {
  estado?: EstadoPrestamo;
  fechaDevolucion?: string;
  notas?: string;
}

import { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CreditCard,
  RefreshCw,
  Filter,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { dashboardService } from '@/services/dashboard.service';
import { formatMonto, formatDate } from '@/lib/format';
import type { Movimiento } from '@/types';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';

type TipoFilter = Movimiento['tipo'] | 'todos';

const TIPO_CONFIG: Record<
  Movimiento['tipo'],
  { label: string; icon: React.ReactNode; color: string }
> = {
  ingreso: {
    label: 'Ingreso',
    icon: <ArrowDownLeft className="h-3.5 w-3.5" />,
    color: 'text-success',
  },
  egreso: {
    label: 'Egreso',
    icon: <ArrowUpRight className="h-3.5 w-3.5" />,
    color: 'text-destructive',
  },
  compra: {
    label: 'Compra',
    icon: <ArrowLeftRight className="h-3.5 w-3.5" />,
    color: 'text-primary',
  },
  venta: {
    label: 'Venta',
    icon: <ArrowLeftRight className="h-3.5 w-3.5" />,
    color: 'text-primary',
  },
  pago_interes: {
    label: 'Interés',
    icon: <CreditCard className="h-3.5 w-3.5" />,
    color: 'text-warning',
  },
  devolucion: {
    label: 'Devolución',
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    color: 'text-muted-foreground',
  },
  gasto: {
    label: 'Gasto',
    icon: <ArrowUpRight className="h-3.5 w-3.5" />,
    color: 'text-orange-400',
  },
  ingreso_efectivo: {
    label: 'Ingreso',
    icon: <ArrowDownLeft className="h-3.5 w-3.5" />,
    color: 'text-emerald-400',
  },
};

export function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [sortFecha, setSortFecha] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    dashboardService
      .getMovimientos()
      .then(setMovimientos)
      .finally(() => setLoading(false));
  }, []);

  const filtered = movimientos
    .filter((m) => {
      if (tipoFilter !== 'todos' && m.tipo !== tipoFilter) return false;
      const fecha = m.fecha.slice(0, 10);
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      return true;
    })
    .sort((a, b) => {
      const diff = a.fecha.localeCompare(b.fecha);
      return sortFecha === 'asc' ? diff : -diff;
    });

  const hayFiltros = tipoFilter !== 'todos' || desde || hasta;

  // Totales por moneda (haber - debe)
  const totales: Record<string, number> = {};
  for (const m of filtered) {
    const moneda = m.moneda;
    totales[moneda] = (totales[moneda] ?? 0) + (m.haber ?? 0) - (m.debe ?? 0);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Movimientos</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Libro diario de todos los movimientos (debe / haber)
        </p>
      </div>

      {/* Resumen balances */}
      {!loading && Object.entries(totales).length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Object.entries(totales).length}, minmax(0, 1fr))` }}>
          {Object.entries(totales).map(([moneda, balance]) => (
            <div key={moneda} className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Balance {moneda}
              </p>
              <p
                className={cn(
                  'font-mono font-bold text-lg',
                  balance >= 0 ? 'text-success' : 'text-destructive',
                )}
              >
                {balance >= 0 ? '+' : ''}
                {formatMonto(balance, moneda as never)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as TipoFilter)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="ingreso">Ingresos</SelectItem>
            <SelectItem value="egreso">Egresos</SelectItem>
            <SelectItem value="compra">Compras</SelectItem>
            <SelectItem value="venta">Ventas</SelectItem>
            <SelectItem value="pago_interes">Pago de intereses</SelectItem>
            <SelectItem value="devolucion">Devoluciones</SelectItem>
            <SelectItem value="gasto">Gastos</SelectItem>
            <SelectItem value="ingreso_efectivo">Ingresos en efectivo</SelectItem>
          </SelectContent>
        </Select>
        <DateRangePicker
          desde={desde}
          hasta={hasta}
          onChange={(d, h) => { setDesde(d); setHasta(h); }}
          placeholder="Filtrar por fecha"
        />
        {hayFiltros && (
          <button
            onClick={() => { setTipoFilter('todos'); setDesde(''); setHasta(''); }}
            className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted/50 transition-colors"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {/* Tabla debe/haber */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 px-4 py-2.5 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <div className="col-span-2">
            <button
              onClick={() => setSortFecha((s) => (s === 'asc' ? 'desc' : 'asc'))}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              Fecha
              {sortFecha === 'asc' ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
            </button>
          </div>
          <div className="col-span-4">Descripción</div>
          <div className="col-span-1">Tipo</div>
          <div className="col-span-1">Moneda</div>
          <div className="col-span-2 text-right text-destructive/80">Debe (−)</div>
          <div className="col-span-2 text-right text-success/80">Haber (+)</div>
        </div>

        {/* Filas */}
        <div className="divide-y divide-border">
          {loading && (
            <div className="text-center py-12 text-muted-foreground text-sm">Cargando...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Sin movimientos
            </div>
          )}
          {filtered.map((m) => {
            const config = TIPO_CONFIG[m.tipo];
            return (
              <div
                key={m.id}
                className="grid grid-cols-12 px-4 py-3 hover:bg-muted/20 transition-colors text-sm items-center"
              >
                <div className="col-span-2 text-muted-foreground text-xs font-mono">
                  {formatDate(m.fecha)}
                </div>
                <div className="col-span-4 min-w-0 pr-3">
                  <p className="truncate font-medium text-xs">{m.descripcion}</p>
                  {m.cliente && (
                    <p className="text-xs text-muted-foreground truncate">{m.cliente}</p>
                  )}
                </div>
                <div className="col-span-1">
                  <Badge
                    variant="outline"
                    className={cn('text-xs gap-1 px-1.5 py-0.5', config.color)}
                  >
                    {config.icon}
                    <span className="hidden sm:inline">{config.label}</span>
                  </Badge>
                </div>
                <div className="col-span-1 text-xs font-medium text-muted-foreground">
                  {m.moneda}
                </div>
                <div className="col-span-2 text-right font-mono text-sm">
                  {m.debe != null ? (
                    <span className="text-destructive">
                      {formatMonto(m.debe, m.moneda)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </div>
                <div className="col-span-2 text-right font-mono text-sm">
                  {m.haber != null ? (
                    <span className="text-success">
                      {formatMonto(m.haber, m.moneda)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer con totales */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-12 px-4 py-3 border-t border-border bg-muted/20 text-xs font-semibold">
            <div className="col-span-7 uppercase tracking-wide text-muted-foreground">
              Total · {filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}
            </div>
            <div className="col-span-1 text-muted-foreground" />
            <div className="col-span-2 text-right font-mono text-destructive/80">
              {formatMonto(
                filtered.reduce((s, m) => s + (m.debe ?? 0), 0),
                'ARS',
              ).replace('$', '')}
            </div>
            <div className="col-span-2 text-right font-mono text-success/80">
              {formatMonto(
                filtered.reduce((s, m) => s + (m.haber ?? 0), 0),
                'ARS',
              ).replace('$', '')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

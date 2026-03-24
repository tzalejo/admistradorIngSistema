import { memo, useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, ArrowRight, Receipt, ArrowDownToLine, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { operacionesService } from '@/services/operaciones.service';
import { dashboardService } from '@/services/dashboard.service';
import { monedasService, type MonedaItem } from '@/services/monedas.service';
import { formatMonto, formatDate } from '@/lib/format';
import type { Operacion, Moneda } from '@/types';
import { NuevaOperacionDialog } from '@/components/operaciones/NuevaOperacionDialog';
import { EditarOperacionDialog } from '@/components/operaciones/EditarOperacionDialog';
import { formatTasaDisplay } from '@/components/operaciones/operaciones-helpers';

const OperacionBadge = memo(function OperacionBadge({ op }: { op: Operacion }) {
  if (op.tipo === 'gasto') {
    return (
      <Badge variant="outline" className="border-orange-500/50 text-orange-400">
        <span className="flex items-center gap-1">
          <Receipt className="h-3 w-3" />
          gasto
        </span>
      </Badge>
    );
  }
  if (op.tipo === 'ingreso') {
    return (
      <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
        <span className="flex items-center gap-1">
          <ArrowDownToLine className="h-3 w-3" />
          ingreso
        </span>
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-primary/40 text-primary font-mono text-xs px-2">
      <span className="flex items-center gap-1">
        {op.monedaOrigen}
        <ArrowRight className="h-3 w-3" />
        {op.monedaDestino}
      </span>
    </Badge>
  );
});

export function OperacionesPage() {
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [monedas, setMonedas] = useState<MonedaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOp, setEditingOp] = useState<Operacion | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [capitalPorMoneda, setCapitalPorMoneda] = useState<Record<string, number>>({});
  const today = new Date().toISOString().slice(0, 10);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [sortFecha, setSortFecha] = useState<'asc' | 'desc'>('desc');

  const handleDateRange = useCallback((d: string, h: string) => {
    setDesde(d);
    setHasta(h);
  }, []);

  useEffect(() => {
    Promise.all([
      operacionesService.getAll(),
      dashboardService.getCaja(),
      monedasService.getAll(),
    ]).then(([ops, caja, mds]) => {
      setOperaciones(ops);
      setCapitalPorMoneda(caja);
      setMonedas(mds);
    }).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta operación?')) return;
    setDeleting(id);
    try {
      await operacionesService.delete(id);
      setOperaciones((prev) => prev.filter((op) => op.id !== id));
      const caja = await dashboardService.getCaja();
      setCapitalPorMoneda(caja);
    } finally {
      setDeleting(null);
    }
  };

  // Si no hay filtro de fecha, mostrar solo hoy por defecto
  const efectivoDesde = desde || today;
  const efectivoHasta = hasta || today;

  const filteredOperaciones = operaciones
    .filter((op) => {
      const fecha = op.fecha.slice(0, 10);
      if (fecha < efectivoDesde) return false;
      if (fecha > efectivoHasta) return false;
      return true;
    })
    .sort((a, b) => {
      const diff = a.fecha.localeCompare(b.fecha);
      return sortFecha === 'asc' ? diff : -diff;
    });

  const hayFiltros = desde || hasta;

  // Solo se puede eliminar la última operación registrada (la más reciente por fecha+hora)
  const lastOperacionId = operaciones.reduce<number | null>((lastId, op) => {
    if (lastId === null) return op.id;
    const last = operaciones.find((o) => o.id === lastId)!;
    const cmpFecha = op.fecha.localeCompare(last.fecha);
    if (cmpFecha > 0) return op.id;
    if (cmpFecha === 0 && (op.hora ?? '') > (last.hora ?? '')) return op.id;
    return lastId;
  }, null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Operaciones</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Cambios de divisa y gastos
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva operación
        </Button>
      </div>

      {operaciones.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total operaciones</p>
            <p className="text-xl font-bold">{filteredOperaciones.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cambios de divisa</p>
            <p className="text-xl font-bold">{filteredOperaciones.filter((o) => o.tipo !== 'gasto' && o.tipo !== 'ingreso').length}</p>
          </div>
        </div>
      )}

      <DateRangePicker
        desde={desde}
        hasta={hasta}
        onChange={handleDateRange}
        placeholder="Filtrar por fecha"
      />

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
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
              </TableHead>
              <TableHead>Operación</TableHead>
              <TableHead>Entrega / Gasto / Ingreso</TableHead>
              <TableHead>Tasa</TableHead>
              <TableHead>Recibe</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="w-12">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}
            {!loading && filteredOperaciones.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  {hayFiltros ? 'Sin operaciones en ese rango de fechas' : 'Sin operaciones registradas'}
                </TableCell>
              </TableRow>
            )}
            {filteredOperaciones.map((op) => (
              <TableRow key={op.id}>
                <TableCell>
                  <div>{formatDate(op.fecha)}</div>
                  {op.hora && <div className="text-xs text-muted-foreground">{op.hora.slice(0, 5)}</div>}
                </TableCell>
                <TableCell><OperacionBadge op={op} /></TableCell>
                <TableCell className="font-mono text-sm">
                  {op.tipo === 'ingreso' ? (
                    <span className="text-emerald-400">+{formatMonto(op.montoOrigen, op.monedaOrigen)}</span>
                  ) : (
                    <span className="text-destructive/80">-{formatMonto(op.montoOrigen, op.monedaOrigen)}</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {formatTasaDisplay(op.tasaCambio, op.monedaOrigen, op.monedaDestino)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {op.montoDestino !== null && op.monedaDestino !== null ? (
                    <span className="text-success">+{formatMonto(op.montoDestino, op.monedaDestino as Moneda)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                  {op.notas ?? '—'}
                </TableCell>
                <TableCell>
                  {op.id === lastOperacionId && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingOp(op)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                        disabled={deleting === op.id}
                        onClick={() => handleDelete(op.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {showForm && (
        <NuevaOperacionDialog
          monedas={monedas}
          capitalPorMoneda={capitalPorMoneda}
          onClose={() => setShowForm(false)}
          onCreated={async () => {
            setShowForm(false);
            const [ops, caja] = await Promise.all([
              operacionesService.getAll(),
              dashboardService.getCaja(),
            ]);
            setOperaciones(ops);
            setCapitalPorMoneda(caja);
          }}
        />
      )}

      {editingOp && (
        <EditarOperacionDialog
          operacion={editingOp}
          monedas={monedas}
          capitalPorMoneda={capitalPorMoneda}
          onClose={() => setEditingOp(null)}
          onUpdated={async () => {
            setEditingOp(null);
            const [ops, caja] = await Promise.all([
              operacionesService.getAll(),
              dashboardService.getCaja(),
            ]);
            setOperaciones(ops);
            setCapitalPorMoneda(caja);
          }}
        />
      )}
    </div>
  );
}

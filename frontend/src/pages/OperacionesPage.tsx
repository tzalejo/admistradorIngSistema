import { useEffect, useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, AlertTriangle, Filter, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { operacionesService } from '@/services/operaciones.service';
import { prestamosService } from '@/services/prestamos.service';
import { dashboardService } from '@/services/dashboard.service';
import { monedasService, type MonedaItem } from '@/services/monedas.service';
import { formatMonto, formatDate } from '@/lib/format';
import type { Operacion, CreateOperacionDto, Moneda, TipoOperacion, Prestamo } from '@/types';

function TipoBadge({ tipo }: { tipo: TipoOperacion }) {
  if (tipo === 'gasto') {
    return (
      <Badge variant="outline" className="border-orange-500/50 text-orange-400">
        <span className="flex items-center gap-1">
          <Receipt className="h-3 w-3" />
          gasto
        </span>
      </Badge>
    );
  }
  return (
    <Badge variant={tipo === 'compra' ? 'default' : 'secondary'}>
      <span className="flex items-center gap-1">
        {tipo === 'compra' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {tipo}
      </span>
    </Badge>
  );
}

export function OperacionesPage() {
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [monedas, setMonedas] = useState<MonedaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterPrestamo, setFilterPrestamo] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [capitalPorMoneda, setCapitalPorMoneda] = useState<Record<string, number>>({});

  const load = () => {
    setLoading(true);
    Promise.all([
      operacionesService.getAll(filterPrestamo || undefined),
      prestamos.length === 0 ? prestamosService.getAll() : Promise.resolve(prestamos),
    ])
      .then(([ops, prests]) => {
        setOperaciones(ops);
        if (prestamos.length === 0) setPrestamos(prests);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterPrestamo]);

  useEffect(() => {
    dashboardService.getResumen().then((r) => setCapitalPorMoneda(r.capitalTotalPorMoneda));
  }, []);

  useEffect(() => {
    monedasService.getAll().then(setMonedas);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta operación?')) return;
    setDeleting(id);
    try {
      await operacionesService.delete(id);
      load();
    } finally {
      setDeleting(null);
    }
  };

  const gananciaARS = operaciones.reduce((sum, op) => {
    if (op.tipo === 'gasto' && op.monedaOrigen === 'ARS') return sum - op.montoOrigen;
    if (op.monedaOrigen === 'ARS') return sum - op.montoOrigen;
    if (op.monedaDestino === 'ARS' && op.montoDestino) return sum + op.montoDestino;
    return sum;
  }, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Operaciones</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Compras, ventas de divisas y gastos
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva operación
        </Button>
      </div>

      {operaciones.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total operaciones</p>
            <p className="text-xl font-bold">{operaciones.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cambios de divisa</p>
            <p className="text-xl font-bold">{operaciones.filter((o) => o.tipo !== 'gasto').length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Balance neto ARS</p>
            <p className={`text-xl font-bold font-mono ${gananciaARS >= 0 ? 'text-success' : 'text-destructive'}`}>
              {gananciaARS >= 0 ? '+' : ''}{formatMonto(gananciaARS, 'ARS')}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 max-w-sm">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={filterPrestamo || 'all'} onValueChange={(v) => setFilterPrestamo(v === 'all' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Todos los préstamos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los préstamos</SelectItem>
            {prestamos.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.cliente} · {p.moneda}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Entrega / Gasto</TableHead>
              <TableHead>Tasa</TableHead>
              <TableHead>Recibe</TableHead>
              <TableHead>Préstamo / Concepto</TableHead>
              <TableHead className="w-12">—</TableHead>
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
            {!loading && operaciones.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Sin operaciones registradas
                </TableCell>
              </TableRow>
            )}
            {operaciones.map((op) => (
              <TableRow key={op.id}>
                <TableCell>{formatDate(op.fecha)}</TableCell>
                <TableCell><TipoBadge tipo={op.tipo} /></TableCell>
                <TableCell className="font-mono text-sm">
                  <span className="text-destructive/80">
                    -{formatMonto(op.montoOrigen, op.monedaOrigen)}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {op.tasaCambio !== null ? op.tasaCambio.toLocaleString('es-AR') : '—'}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {op.montoDestino !== null && op.monedaDestino !== null ? (
                    <span className="text-success">+{formatMonto(op.montoDestino, op.monedaDestino)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                  {op.tipo === 'gasto' ? (op.notas ?? '—') : (op.prestamo?.cliente ?? '—')}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                    disabled={deleting === op.id}
                    onClick={() => handleDelete(op.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {showForm && (
        <NuevaOperacionDialog
          prestamos={prestamos}
          monedas={monedas}
          capitalPorMoneda={capitalPorMoneda}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

// ── Formulario nueva operación ────────────────────────────────────────────────

function NuevaOperacionDialog({
  prestamos,
  monedas,
  capitalPorMoneda,
  onClose,
  onCreated,
}: {
  prestamos: Prestamo[];
  monedas: MonedaItem[];
  capitalPorMoneda: Record<string, number>;
  onClose: () => void;
  onCreated: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const defaultOrigen = monedas[0]?.codigo ?? 'ARS';
  const defaultDestino = monedas[1]?.codigo ?? 'USDT';
  const [form, setForm] = useState<CreateOperacionDto>({
    tipo: 'compra',
    monedaOrigen: defaultOrigen,
    monedaDestino: defaultDestino,
    montoOrigen: 0,
    tasaCambio: 0,
    montoDestino: 0,
    fecha: today,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isGasto = form.tipo === 'gasto';

  const set = (field: keyof CreateOperacionDto, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const calcDestino = (origen: number, tasa: number, origenM: Moneda, destinoM: Moneda) => {
    if (tasa <= 0) return 0;
    if ((origenM === 'ARS' || origenM === 'USD') && (destinoM === 'USDT' || destinoM === 'BTC')) {
      return origen / tasa;
    }
    return origen * tasa;
  };

  // Al cambiar moneda origen: auto-fill con el capital disponible
  const handleMonedaOrigenChange = (moneda: Moneda) => {
    const capital = capitalPorMoneda[moneda] ?? 0;
    const destino = !isGasto
      ? calcDestino(capital, form.tasaCambio ?? 0, moneda, form.monedaDestino as Moneda)
      : 0;
    setForm((f) => ({
      ...f,
      monedaOrigen: moneda,
      montoOrigen: capital,
      ...(isGasto ? {} : { montoDestino: destino }),
    }));
  };

  const handleMontoOrigenChange = (v: number) => {
    const destino = !isGasto
      ? calcDestino(v, form.tasaCambio ?? 0, form.monedaOrigen, form.monedaDestino as Moneda)
      : 0;
    setForm((f) => ({ ...f, montoOrigen: v, ...(!isGasto ? { montoDestino: destino } : {}) }));
  };

  const handleTasaChange = (v: number) => {
    const destino = calcDestino(form.montoOrigen, v, form.monedaOrigen, form.monedaDestino as Moneda);
    setForm((f) => ({ ...f, tasaCambio: v, montoDestino: destino }));
  };

  // Al cambiar tipo: limpiar/restablecer campos según corresponda
  const handleTipoChange = (tipo: TipoOperacion) => {
    setForm((f) => ({
      ...f,
      tipo,
      ...(tipo === 'gasto'
        ? { monedaDestino: undefined, tasaCambio: undefined, montoDestino: undefined }
        : { monedaDestino: f.monedaDestino ?? defaultDestino, tasaCambio: f.tasaCambio ?? 0, montoDestino: f.montoDestino ?? 0 }),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.montoOrigen <= 0) return setError('El monto debe ser mayor a 0');
    if (!isGasto && (form.tasaCambio ?? 0) <= 0) return setError('La tasa de cambio debe ser mayor a 0');
    if (!isGasto && form.monedaOrigen === form.monedaDestino) return setError('Las monedas deben ser distintas');
    setSaving(true);
    try {
      await operacionesService.create(form);
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear operación');
    } finally {
      setSaving(false);
    }
  };

  // Monedas disponibles para destino (excluir la de origen)
  const monedasDestino = monedas.filter((m) => m.codigo !== form.monedaOrigen);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar operación</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de operación</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => handleTipoChange(v as TipoOperacion)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="venta">Venta</SelectItem>
                  <SelectItem value="gasto">Gasto / Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={form.fecha}
                onChange={(e) => set('fecha', e.target.value)}
              />
            </div>
          </div>

          {/* Moneda y monto */}
          <div className="rounded-md border border-border p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {isGasto ? 'Pago' : 'Entrego'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Select
                  value={form.monedaOrigen}
                  onValueChange={(v) => handleMonedaOrigenChange(v as Moneda)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monedas.map((m) => (
                      <SelectItem key={m.codigo} value={m.codigo}>{m.codigo} — {m.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Cantidad
                  {capitalPorMoneda[form.monedaOrigen] > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground font-normal">
                      (disponible: {formatMonto(capitalPorMoneda[form.monedaOrigen], form.monedaOrigen)})
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.montoOrigen || ''}
                  onChange={(e) => handleMontoOrigenChange(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Campos solo para compra/venta */}
          {!isGasto && (
            <>
              <div className="space-y-1.5">
                <Label>Tasa de cambio</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="ej: 1450"
                  value={form.tasaCambio || ''}
                  onChange={(e) => handleTasaChange(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="rounded-md border border-border p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Recibo
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Moneda</Label>
                    <Select
                      value={form.monedaDestino ?? monedasDestino[0]?.codigo ?? ''}
                      onValueChange={(v) => set('monedaDestino', v as Moneda)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monedasDestino.map((m) => (
                          <SelectItem key={m.codigo} value={m.codigo}>{m.codigo} — {m.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cantidad (calculada)</Label>
                    <Input
                      type="number"
                      step="any"
                      value={form.montoDestino ? (form.montoDestino as number).toFixed(8) : ''}
                      onChange={(e) => set('montoDestino', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Préstamo asociado (solo compra/venta) */}
          {!isGasto && (
            <div className="space-y-1.5">
              <Label>Asociar a préstamo (opcional)</Label>
              <Select
                value={form.prestamoId ?? 'none'}
                onValueChange={(v) => set('prestamoId', v === 'none' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin asociar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asociar</SelectItem>
                  {prestamos
                    .filter((p) => p.estado === 'activo')
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.cliente} · {formatMonto(p.montoInicial, p.moneda)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{isGasto ? 'Concepto / Proveedor' : 'Notas (opcional)'}</Label>
            <Textarea
              placeholder={isGasto ? 'Ej: Luz, Gas, Hosting, Proveedor X...' : 'Plataforma, contraparte, etc.'}
              value={form.notas ?? ''}
              onChange={(e) => set('notas', e.target.value)}
              rows={2}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

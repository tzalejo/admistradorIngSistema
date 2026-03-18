import { useEffect, useState } from 'react';
import { Plus, Trash2, ArrowRight, AlertTriangle, Receipt, ArrowDownToLine, ArrowUp, ArrowDown } from 'lucide-react';
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
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { operacionesService } from '@/services/operaciones.service';
import { dashboardService } from '@/services/dashboard.service';
import { monedasService, type MonedaItem } from '@/services/monedas.service';
import { formatMonto, formatDate, todayStr } from '@/lib/format';
import type { Operacion, CreateOperacionDto, Moneda } from '@/types';

function OperacionBadge({ op }: { op: Operacion }) {
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
}

export function OperacionesPage() {
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [monedas, setMonedas] = useState<MonedaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [capitalPorMoneda, setCapitalPorMoneda] = useState<Record<string, number>>({});
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [sortFecha, setSortFecha] = useState<'asc' | 'desc'>('desc');

  const loadCaja = () => dashboardService.getCaja().then(setCapitalPorMoneda);

  const load = () => {
    setLoading(true);
    operacionesService.getAll()
      .then(setOperaciones)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadCaja(); }, []);
  useEffect(() => { monedasService.getAll().then(setMonedas); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta operación?')) return;
    setDeleting(id);
    try {
      await operacionesService.delete(id);
      load();
      loadCaja();
    } finally {
      setDeleting(null);
    }
  };

  const filteredOperaciones = operaciones
    .filter((op) => {
      const fecha = op.fecha.slice(0, 10);
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      return true;
    })
    .sort((a, b) => {
      const diff = a.fecha.localeCompare(b.fecha);
      return sortFecha === 'asc' ? diff : -diff;
    });

  const hayFiltros = desde || hasta;

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
        onChange={(d, h) => { setDesde(d); setHasta(h); }}
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
            {!loading && filteredOperaciones.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  {hayFiltros ? 'Sin operaciones en ese rango de fechas' : 'Sin operaciones registradas'}
                </TableCell>
              </TableRow>
            )}
            {filteredOperaciones.map((op) => (
              <TableRow key={op.id}>
                <TableCell>{formatDate(op.fecha)}</TableCell>
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
                    <span className="text-success">+{formatMonto(op.montoDestino, op.monedaDestino)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                  {op.notas ?? '—'}
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
          monedas={monedas}
          capitalPorMoneda={capitalPorMoneda}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); loadCaja(); }}
        />
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONEDAS_FIAT = new Set(['ARS', 'USD']);
const MONEDAS_STABLECOIN = new Set(['USDT', 'USD', 'USDC']);

function esPorPorcentaje(origen: string, destino: string): boolean {
  return MONEDAS_STABLECOIN.has(origen) && MONEDAS_STABLECOIN.has(destino) && origen !== destino;
}

function derivarTipo(monedaOrigen: string): 'compra' | 'venta' {
  return MONEDAS_FIAT.has(monedaOrigen) ? 'compra' : 'venta';
}

function formatTasaDisplay(tasaCambio: number | null, monedaOrigen: string, monedaDestino: string | null): string {
  if (tasaCambio === null) return '—';
  if (monedaDestino && esPorPorcentaje(monedaOrigen, monedaDestino)) {
    const pct = (tasaCambio - 1) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(4).replace(/\.?0+$/, '')}%`;
  }
  return tasaCambio.toLocaleString('es-AR');
}

// ── MoneyInput: input de texto con formato de miles al salir ──────────────────

function parseMoney(str: string): number {
  if (!str) return 0;
  // Si hay coma, asumimos formato argentino: punto=miles, coma=decimal
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  // Si hay un único punto y podría ser decimal en inglés, lo dejamos como está
  return parseFloat(str.replace(/[^\d.]/g, '')) || 0;
}

function MoneyInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState('');

  const formatted =
    value > 0 ? value.toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '';

  return (
    <Input
      type="text"
      inputMode="decimal"
      className={className}
      placeholder={placeholder ?? '0'}
      value={focused ? raw : formatted}
      onFocus={(e) => {
        setFocused(true);
        setRaw(value > 0 ? String(value) : '');
        setTimeout(() => e.target.select(), 0);
      }}
      onBlur={() => {
        setFocused(false);
        onChange(parseMoney(raw));
      }}
      onChange={(e) => {
        setRaw(e.target.value);
        const parsed = parseMoney(e.target.value);
        if (parsed >= 0) onChange(parsed);
      }}
    />
  );
}

// ── Formulario nueva operación ────────────────────────────────────────────────

type ModoFormulario = 'cambio' | 'gasto' | 'ingreso';

interface FormState {
  monedaOrigen: string;
  monedaDestino: string;
  montoOrigen: number;
  tasaCambio: number;
  montoDestino: number;
  fecha: string;
  notas?: string;
}

const MODOS: { key: ModoFormulario; label: string; icon: React.ReactNode }[] = [
  { key: 'cambio', label: 'Cambio de divisa', icon: <ArrowRight className="h-3.5 w-3.5" /> },
  { key: 'gasto', label: 'Gasto', icon: <Receipt className="h-3.5 w-3.5" /> },
  { key: 'ingreso', label: 'Ingreso / Cobro', icon: <ArrowDownToLine className="h-3.5 w-3.5" /> },
];

function NuevaOperacionDialog({
  monedas,
  capitalPorMoneda,
  onClose,
  onCreated,
}: {
  monedas: MonedaItem[];
  capitalPorMoneda: Record<string, number>;
  onClose: () => void;
  onCreated: () => void;
}) {
  const today = todayStr();

  // ── Estado modo cambio/gasto ──
  const monedasOrdenadas = [...monedas].sort((a, b) =>
    (capitalPorMoneda[b.codigo] ?? 0) - (capitalPorMoneda[a.codigo] ?? 0)
  );
  const primeraConBalance = monedasOrdenadas[0]?.codigo ?? 'ARS';
  const segundaDistinta = monedasOrdenadas.find((m) => m.codigo !== primeraConBalance)?.codigo ?? 'USDT';

  const [modo, setModo] = useState<ModoFormulario>('cambio');
  const [form, setForm] = useState<FormState>({
    monedaOrigen: primeraConBalance,
    monedaDestino: segundaDistinta,
    montoOrigen: capitalPorMoneda[primeraConBalance] ?? 0,
    tasaCambio: 0,
    montoDestino: 0,
    fecha: today,
  });
  const [porcentaje, setPorcentaje] = useState<number>(0);
  const [gastoMoneda, setGastoMoneda] = useState<string>(primeraConBalance);
  const [gastoMonto, setGastoMonto] = useState<number>(0);
  const [gastoNotas, setGastoNotas] = useState('');
  const [gastoFecha, setGastoFecha] = useState(today);

  const [ingresoMoneda, setIngresoMoneda] = useState<string>(primeraConBalance);
  const [ingresoMonto, setIngresoMonto] = useState<number>(0);
  const [ingresoNotas, setIngresoNotas] = useState('');
  const [ingresoFecha, setIngresoFecha] = useState(today);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof FormState, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const usarPorcentaje = esPorPorcentaje(form.monedaOrigen, form.monedaDestino);

  const calcDestino = (origen: number, tasa: number, origenM: string, destinoM: string) => {
    if (tasa <= 0 && !esPorPorcentaje(origenM, destinoM)) return 0;
    // ARS es siempre la moneda "base" (más barata): se divide para obtener la moneda destino.
    // Cubre ARS→USDT, ARS→USD y cualquier otro ARS→X.
    if (origenM === 'ARS') return origen / tasa;
    return origen * tasa;
  };

  const handleMonedaOrigenChange = (moneda: Moneda) => {
    const capital = capitalPorMoneda[moneda] ?? 0;
    const nuevoDestino = form.monedaDestino === moneda
      ? monedas.find((m) => m.codigo !== moneda)?.codigo ?? form.monedaDestino
      : form.monedaDestino;
    const nuevaEsPct = esPorPorcentaje(moneda, nuevoDestino);
    const tasa = nuevaEsPct ? 1 + porcentaje / 100 : form.tasaCambio;
    const destino = nuevaEsPct
      ? capital * (1 + porcentaje / 100)
      : calcDestino(capital, form.tasaCambio, moneda, nuevoDestino);
    setForm((f) => ({ ...f, monedaOrigen: moneda, monedaDestino: nuevoDestino, montoOrigen: capital, tasaCambio: tasa, montoDestino: destino }));
  };

  const handleMontoOrigenChange = (v: number) => {
    const destino = usarPorcentaje
      ? v * (1 + porcentaje / 100)
      : calcDestino(v, form.tasaCambio, form.monedaOrigen, form.monedaDestino);
    setForm((f) => ({ ...f, montoOrigen: v, montoDestino: destino }));
  };

  const handleTasaChange = (v: number) => {
    const destino = calcDestino(form.montoOrigen, v, form.monedaOrigen, form.monedaDestino);
    setForm((f) => ({ ...f, tasaCambio: v, montoDestino: destino }));
  };

  const handlePorcentajeChange = (pct: number) => {
    const tasa = 1 + pct / 100;
    setPorcentaje(pct);
    setForm((f) => ({ ...f, tasaCambio: tasa, montoDestino: f.montoOrigen * tasa }));
  };

  const handleMonedaDestinoChange = (moneda: string) => {
    const nuevaEsPct = esPorPorcentaje(form.monedaOrigen, moneda);
    if (nuevaEsPct) {
      const tasa = 1 + porcentaje / 100;
      setForm((f) => ({ ...f, monedaDestino: moneda, tasaCambio: tasa, montoDestino: f.montoOrigen * tasa }));
    } else {
      const destino = calcDestino(form.montoOrigen, form.tasaCambio, form.monedaOrigen, moneda);
      setForm((f) => ({ ...f, monedaDestino: moneda, montoDestino: destino }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (modo === 'cambio') {
        if (form.montoOrigen <= 0) { setError('El monto debe ser mayor a 0'); return; }
        if (!usarPorcentaje && form.tasaCambio <= 0) { setError('La tasa de cambio debe ser mayor a 0'); return; }
        if (form.monedaOrigen === form.monedaDestino) { setError('Las monedas deben ser distintas'); return; }
        const dto: CreateOperacionDto = {
          tipo: derivarTipo(form.monedaOrigen),
          monedaOrigen: form.monedaOrigen,
          monedaDestino: form.monedaDestino,
          montoOrigen: form.montoOrigen,
          tasaCambio: form.tasaCambio,
          montoDestino: form.montoDestino,
          fecha: form.fecha,
          notas: form.notas,
        };
        await operacionesService.create(dto);

      } else if (modo === 'gasto') {
        if (gastoMonto <= 0) { setError('El monto debe ser mayor a 0'); return; }
        if (!gastoNotas.trim()) { setError('Ingresá un concepto para el gasto'); return; }
        const dto: CreateOperacionDto = {
          tipo: 'gasto',
          monedaOrigen: gastoMoneda,
          montoOrigen: gastoMonto,
          fecha: gastoFecha,
          notas: gastoNotas,
        };
        await operacionesService.create(dto);

      } else if (modo === 'ingreso') {
        if (ingresoMonto <= 0) { setError('El monto debe ser mayor a 0'); return; }
        if (!ingresoNotas.trim()) { setError('Ingresá un concepto para el ingreso'); return; }
        const dto: CreateOperacionDto = {
          tipo: 'ingreso',
          monedaOrigen: ingresoMoneda,
          montoOrigen: ingresoMonto,
          fecha: ingresoFecha,
          notas: ingresoNotas,
        };
        await operacionesService.create(dto);

      }

      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  const monedasDestino = monedas.filter((m) => m.codigo !== form.monedaOrigen);
  const balanceOrigen = capitalPorMoneda[form.monedaOrigen] ?? 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar operación</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de modo — grilla 3 columnas */}
          <div className="grid grid-cols-3 gap-1 rounded-md border border-border overflow-hidden">
            {MODOS.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                  modo === m.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => { setModo(m.key); setError(''); }}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          {/* ── Cambio de divisa ── */}
          {modo === 'cambio' && (
            <>
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} />
              </div>

              <div className="rounded-md border border-border p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entrego</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Moneda</Label>
                    <Select value={form.monedaOrigen} onValueChange={(v) => handleMonedaOrigenChange(v as Moneda)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {monedasOrdenadas.map((m) => {
                          const bal = capitalPorMoneda[m.codigo] ?? 0;
                          return (
                            <SelectItem key={m.codigo} value={m.codigo}>
                              <span className="flex items-center gap-2">
                                <span>{m.codigo}</span>
                                {bal > 0 && <span className="text-xs text-success font-mono">{formatMonto(bal, m.codigo as Moneda)}</span>}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Cantidad
                      {balanceOrigen > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground font-normal">
                          (caja: {formatMonto(balanceOrigen, form.monedaOrigen as Moneda)})
                        </span>
                      )}
                    </Label>
                    <MoneyInput
                      value={form.montoOrigen}
                      onChange={handleMontoOrigenChange}
                    />
                  </div>
                </div>
              </div>

              {usarPorcentaje ? (
                <div className="space-y-1.5">
                  <Label>
                    Variación porcentual
                    <span className="ml-1 text-xs text-muted-foreground font-normal">
                      0% = 1:1 · negativo = descuento · positivo = premio
                    </span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number" step="0.0001" placeholder="ej: -1.3"
                      value={porcentaje === 0 ? '' : porcentaje}
                      onChange={(e) => handlePorcentajeChange(parseFloat(e.target.value) || 0)}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">%</span>
                  </div>
                  {form.montoOrigen > 0 && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Tasa efectiva: {(1 + porcentaje / 100).toFixed(6)} · Recibís: {formatMonto(form.montoDestino, form.monedaDestino as Moneda)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>
                    Tasa de cambio
                    <span className="ml-1 text-xs text-muted-foreground font-normal">({form.monedaOrigen} / {form.monedaDestino})</span>
                  </Label>
                  <Input
                    type="number" min="0" step="any" placeholder="ej: 1450"
                    value={form.tasaCambio || ''}
                    onChange={(e) => handleTasaChange(parseFloat(e.target.value) || 0)}
                  />
                </div>
              )}

              <div className="rounded-md border border-border p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recibo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Moneda</Label>
                    <Select value={form.monedaDestino} onValueChange={handleMonedaDestinoChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {monedasDestino.map((m) => (
                          <SelectItem key={m.codigo} value={m.codigo}>{m.codigo} — {m.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cantidad (calculada)</Label>
                    <MoneyInput
                      value={form.montoDestino}
                      onChange={(v) => set('montoDestino', v)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notas (opcional)</Label>
                <Textarea
                  placeholder="Plataforma, contraparte, etc."
                  value={form.notas ?? ''}
                  onChange={(e) => set('notas', e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}

          {/* ── Gasto ── */}
          {modo === 'gasto' && (
            <>
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input type="date" value={gastoFecha} onChange={(e) => setGastoFecha(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Moneda</Label>
                  <Select value={gastoMoneda} onValueChange={setGastoMoneda}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {monedas.map((m) => (
                        <SelectItem key={m.codigo} value={m.codigo}>{m.codigo} — {m.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Monto</Label>
                  <MoneyInput value={gastoMonto} onChange={setGastoMonto} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Concepto / Proveedor</Label>
                <Textarea
                  placeholder="Ej: Luz, Gas, Hosting, Proveedor X..."
                  value={gastoNotas}
                  onChange={(e) => setGastoNotas(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}

          {/* ── Ingreso ── */}
          {modo === 'ingreso' && (
            <>
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input type="date" value={ingresoFecha} onChange={(e) => setIngresoFecha(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Moneda</Label>
                  <Select value={ingresoMoneda} onValueChange={setIngresoMoneda}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {monedas.map((m) => (
                        <SelectItem key={m.codigo} value={m.codigo}>{m.codigo} — {m.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Monto</Label>
                  <MoneyInput value={ingresoMonto} onChange={setIngresoMonto} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Concepto / Servicio</Label>
                <Textarea
                  placeholder="Ej: Consultoría, Desarrollo web, Trabajo X..."
                  value={ingresoNotas}
                  onChange={(e) => setIngresoNotas(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}

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

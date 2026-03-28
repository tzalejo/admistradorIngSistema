import { memo, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit2,
  TrendingUp,
  CalendarCheck,
  CalendarX,
  Minus,
  RotateCcw,
  CreditCard,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { prestamosService } from '@/services/prestamos.service';
import { formatMonto, formatDate, formatTasa, diasHastaVencimiento, todayStr } from '@/lib/format';
import type {
  Prestamo,
  CuotaInteres,
  PagoCuota,
  ResumenPrestamo,
  UpdateCuotaDto,
  EstadoCuota,
} from '@/types';

export function PrestamoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [prestamo, setPrestamo] = useState<Prestamo | null>(null);
  const [resumen, setResumen] = useState<ResumenPrestamo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editCuota, setEditCuota] = useState<CuotaInteres | null>(null);
  const [pagarCuota, setPagarCuota] = useState<CuotaInteres | null>(null);
  const [devolverCapital, setDevolverCapital] = useState(false);

  const load = () => {
    if (!id) return;
    Promise.all([
      prestamosService.getOne(id),
      prestamosService.getResumen(id),
    ]).then(([p, r]) => {
      setPrestamo(p);
      setResumen(r);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <p className="text-muted-foreground p-4">Cargando...</p>;
  if (!prestamo) return <p className="text-destructive p-4">Préstamo no encontrado</p>;

  const estadoColors = {
    activo: 'default' as const,
    devuelto: 'success' as const,
    vencido: 'destructive' as const,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/prestamos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{prestamo.cliente}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={estadoColors[prestamo.estado]}>
                {prestamo.estado.charAt(0).toUpperCase() + prestamo.estado.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {prestamo.moneda} · {prestamo.plazoMeses} meses
              </span>
            </div>
          </div>
        </div>
        {prestamo.estado === 'activo' && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => setDevolverCapital(true)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Devolver capital
          </Button>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InfoCard label="Capital" value={formatMonto(prestamo.montoInicial, prestamo.moneda)} />
        <InfoCard
          label="Tasa"
          value={formatTasa(prestamo.tasaInicial, prestamo.tasaTipo)}
          sub={prestamo.tasaTipo === 'porcentaje' ? '% mensual' : 'fijo/mes'}
        />
        <InfoCard label="Inicio" value={formatDate(prestamo.fechaInicio)} />
        <InfoCard
          label="Vencimiento"
          value={formatDate(
            new Date(
              new Date(prestamo.fechaInicio).getTime() +
                prestamo.plazoMeses * 30 * 24 * 60 * 60 * 1000,
            ),
          )}
        />
      </div>

      {/* Resumen financiero */}
      {resumen && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Resumen financiero
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <p className="text-muted-foreground mb-0.5">Total intereses (período)</p>
              <p className="font-mono font-semibold">
                {formatMonto(resumen.totalInteresGenerado, prestamo.moneda)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Intereses pagados</p>
              <p className="font-mono font-semibold text-success">
                {formatMonto(resumen.totalInteresPagado, prestamo.moneda)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Intereses pendientes</p>
              <p className="font-mono font-semibold text-warning">
                {formatMonto(resumen.totalInteresPendiente, prestamo.moneda)}
              </p>
            </div>
          </div>

          {/* Barra de progreso de cuotas */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{resumen.cuotasPagadas} de {prestamo.plazoMeses} cuotas pagadas</span>
              <span>{Math.round((resumen.cuotasPagadas / prestamo.plazoMeses) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(resumen.cuotasPagadas / prestamo.plazoMeses) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Historial de pagos */}
      <HistorialPagos
        cuotas={prestamo.cuotas ?? []}
        moneda={prestamo.moneda}
        onPagar={setPagarCuota}
        onChanged={load}
      />

      {/* Cuotas */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">
            Cuotas · {resumen?.cuotasPagadas ?? 0}/{prestamo.plazoMeses} pagadas
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mes</TableHead>
              <TableHead>Tasa</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Pago real</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10">—</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              const cuotasList = prestamo.cuotas ?? [];
              const pagadasParciales = cuotasList.filter(
                (c: CuotaInteres) => c.estado === 'pagado' || c.estado === 'parcial',
              );
              const ultimaEditableId = pagadasParciales.length > 0
                ? pagadasParciales.reduce((max: CuotaInteres, c: CuotaInteres) =>
                    c.mesNumero > max.mesNumero ? c : max,
                  ).id
                : null;

              return cuotasList.map((cuota: CuotaInteres) => {
                const dias = diasHastaVencimiento(cuota.fechaVencimiento);
                const vencida = cuota.estado === 'pendiente' && dias < 0;
                const puedeEditar = cuota.id === ultimaEditableId;

                return (
                  <TableRow key={cuota.id}>
                    <TableCell className="font-medium">{cuota.mesNumero}</TableCell>
                    <TableCell>
                      {formatTasa(cuota.tasaAplicada, prestamo.tasaTipo)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatMonto(cuota.montoPago, prestamo.moneda)}
                    </TableCell>
                    <TableCell>
                      <span className={vencida ? 'text-destructive' : ''}>
                        {formatDate(cuota.fechaVencimiento)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {cuota.fechaPagoReal ? formatDate(cuota.fechaPagoReal) : '—'}
                    </TableCell>
                    <TableCell>
                      {cuota.estado === 'pagado' ? (
                        <span className="flex items-center gap-1 text-success text-xs font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Pagada
                        </span>
                      ) : cuota.estado === 'parcial' ? (
                        <span className="flex items-center gap-1 text-blue-400 text-xs font-medium">
                          <CreditCard className="h-3.5 w-3.5" /> Parcial ({Math.round((cuota.montoPagado / cuota.montoPago) * 100)}%)
                        </span>
                      ) : vencida ? (
                        <span className="flex items-center gap-1 text-destructive text-xs font-medium">
                          <AlertTriangle className="h-3.5 w-3.5" /> Vencida
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-warning text-xs font-medium">
                          <Clock className="h-3.5 w-3.5" /> Pendiente
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {puedeEditar && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditCuota(cuota)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              });
            })()}
          </TableBody>
        </Table>
      </div>

      {editCuota && (
        <EditCuotaDialog
          cuota={editCuota}
          moneda={prestamo.moneda}
          onClose={() => setEditCuota(null)}
          onSaved={() => { setEditCuota(null); load(); }}
        />
      )}

      {pagarCuota && (
        <PagarCuotaDialog
          cuota={pagarCuota}
          moneda={prestamo.moneda}
          onClose={() => setPagarCuota(null)}
          onSaved={() => { setPagarCuota(null); load(); }}
        />
      )}

      {devolverCapital && (
        <DevolverCapitalDialog
          prestamo={prestamo}
          onClose={() => setDevolverCapital(false)}
          onSaved={() => { setDevolverCapital(false); load(); }}
        />
      )}
    </div>
  );
}

function HistorialPagos({
  cuotas,
  moneda,
  onPagar,
  onChanged,
}: {
  cuotas: CuotaInteres[];
  moneda: string;
  onPagar: (cuota: CuotaInteres) => void;
  onChanged: () => void;
}) {
  const [expandedCuotaId, setExpandedCuotaId] = useState<number | null>(null);
  const pagadas = cuotas.filter((c) => c.estado === 'pagado');
  const parciales = cuotas.filter((c) => c.estado === 'parcial');
  const pendientes = cuotas.filter((c) => c.estado === 'pendiente');

  // Solo la última cuota pagada/parcial (por mesNumero) es editable
  const pagadasYParciales = [...pagadas, ...parciales];
  const ultimaEditableId = pagadasYParciales.length > 0
    ? pagadasYParciales.reduce((max, c) => c.mesNumero > max.mesNumero ? c : max).id
    : null;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-primary" />
          Pagos de interés
        </h2>
        <span className="text-xs text-muted-foreground">
          {pagadas.length} pagado{pagadas.length !== 1 ? 's' : ''}
          {parciales.length > 0 && <> · {parciales.length} parcial{parciales.length !== 1 ? 'es' : ''}</>}
          {' '}· {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Cuotas pagadas */}
      {pagadas.length > 0 && (
        <div className="divide-y divide-border">
          {pagadas.map((c) => {
            const diasDiff = c.fechaPagoReal
              ? Math.round(
                  (new Date(c.fechaPagoReal).getTime() - new Date(c.fechaVencimiento).getTime()) /
                  (1000 * 60 * 60 * 24),
                )
              : null;
            const esTarde = diasDiff !== null && diasDiff > 0;
            const esAntes = diasDiff !== null && diasDiff < 0;

            const isExpanded = expandedCuotaId === c.id;
            return (
              <div key={c.id}>
                <div
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => setExpandedCuotaId(isExpanded ? null : c.id)}
                >
                  {/* Indicador de estado de pago */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    esTarde ? 'bg-orange-500/15' : 'bg-success/15'
                  }`}>
                    <CheckCircle2 className={`h-4 w-4 ${esTarde ? 'text-orange-400' : 'text-success'}`} />
                  </div>

                  {/* Mes */}
                  <div className="w-14 flex-shrink-0">
                    <p className="text-xs text-muted-foreground">Mes</p>
                    <p className="font-semibold text-sm">{c.mesNumero}</p>
                  </div>

                  {/* Monto */}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-semibold text-sm">{formatMonto(c.montoPago, moneda)}</p>
                    <p className="text-xs text-muted-foreground">
                      Venc: {formatDate(c.fechaVencimiento)}
                    </p>
                  </div>

                  {/* Fecha de pago real + expand */}
                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {c.fechaPagoReal ? formatDate(c.fechaPagoReal) : '—'}
                      </p>
                      {diasDiff !== null && (
                        <p className={`text-xs flex items-center justify-end gap-0.5 ${
                          esTarde ? 'text-orange-400' : esAntes ? 'text-success' : 'text-muted-foreground'
                        }`}>
                          {esTarde ? (
                            <><CalendarX className="h-3 w-3" /> {diasDiff}d tarde</>
                          ) : esAntes ? (
                            <><CalendarCheck className="h-3 w-3" /> {Math.abs(diasDiff)}d antes</>
                          ) : (
                            <><Minus className="h-3 w-3" /> en fecha</>
                          )}
                        </p>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-3">
                    <PagosCuotaDetail cuotaId={c.id} moneda={moneda} editable={c.id === ultimaEditableId} onChanged={onChanged} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cuotas parciales — pagos incompletos */}
      {parciales.length > 0 && (
        <>
          {pagadas.length > 0 && <div className="border-t border-border" />}
          <div className="px-5 py-3 bg-blue-500/5">
            <p className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-2">
              Pagos parciales
            </p>
            <div className="space-y-2">
              {parciales.map((c) => {
                const saldo = c.montoPago - c.montoPagado;
                const pct = (c.montoPagado / c.montoPago) * 100;
                return (
                  <div key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <CreditCard className="h-3.5 w-3.5 text-blue-400" />
                        Mes {c.mesNumero} · {formatDate(c.fechaVencimiento)}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs">
                          {formatMonto(c.montoPagado, moneda)} / {formatMonto(c.montoPago, moneda)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs gap-1"
                          onClick={() => onPagar(c)}
                        >
                          <CreditCard className="h-3 w-3" />
                          Completar
                        </Button>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Resta: {formatMonto(saldo, moneda)} ({Math.round(100 - pct)}%)
                    </p>
                    <PagosCuotaDetail cuotaId={c.id} moneda={moneda} editable={c.id === ultimaEditableId} onChanged={onChanged} />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Cuotas pendientes — resumen compacto */}
      {pendientes.length > 0 && (
        <>
          {(pagadas.length > 0 || parciales.length > 0) && <div className="border-t border-border" />}
          <div className="px-5 py-3 bg-muted/10">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Próximas cuotas
            </p>
            <div className="space-y-1.5">
              {pendientes.map((c) => {
                const dias = diasHastaVencimiento(c.fechaVencimiento);
                const vencida = dias < 0;
                return (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {vencida
                        ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        : <Clock className="h-3.5 w-3.5" />
                      }
                      Mes {c.mesNumero} · {formatDate(c.fechaVencimiento)}
                      {vencida && <span className="text-destructive text-xs">({Math.abs(dias)}d vencida)</span>}
                      {!vencida && dias <= 7 && <span className="text-warning text-xs">(en {dias}d)</span>}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs">{formatMonto(c.montoPago, moneda)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => onPagar(c)}
                      >
                        <CreditCard className="h-3 w-3" />
                        Pagar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {pagadas.length === 0 && pendientes.length === 0 && (
        <p className="text-center py-8 text-sm text-muted-foreground">Sin cuotas registradas</p>
      )}
    </div>
  );
}

const InfoCard = memo(function InfoCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
});

function EditCuotaDialog({
  cuota,
  moneda,
  onClose,
  onSaved,
}: {
  cuota: CuotaInteres;
  moneda: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<UpdateCuotaDto>({
    tasaAplicada: cuota.tasaAplicada,
    montoPago: cuota.montoPago,
    fechaVencimiento: cuota.fechaVencimiento.split('T')[0],
    fechaPagoReal: cuota.fechaPagoReal?.split('T')[0] ?? '',
    estado: cuota.estado,
    notas: cuota.notas ?? '',
  });
  const [tasaStr, setTasaStr] = useState(String(cuota.tasaAplicada));
  const [montoStr, setMontoStr] = useState(String(cuota.montoPago));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const dto: UpdateCuotaDto = {
        tasaAplicada: form.tasaAplicada,
        montoPago: form.montoPago,
        fechaVencimiento: form.fechaVencimiento,
        fechaPagoReal: form.fechaPagoReal || null,
        estado: form.estado,
        ...(form.notas ? { notas: form.notas } : {}),
      };
      await prestamosService.updateCuota(cuota.id, dto);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar cuota {cuota.mesNumero} · {moneda}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tasa aplicada</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={tasaStr}
                onChange={(e) => {
                  setTasaStr(e.target.value);
                  const num = parseFloat(e.target.value.replace(',', '.'));
                  if (!isNaN(num) && num >= 0) setForm((f) => ({ ...f, tasaAplicada: num }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Monto a pagar</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={montoStr}
                onChange={(e) => {
                  setMontoStr(e.target.value);
                  const num = parseFloat(e.target.value.replace(',', '.'));
                  if (!isNaN(num) && num >= 0) setForm((f) => ({ ...f, montoPago: num }));
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha de vencimiento</Label>
              <Input
                type="date"
                value={form.fechaVencimiento ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, fechaVencimiento: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de pago real</Label>
              <Input
                type="date"
                value={form.fechaPagoReal ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, fechaPagoReal: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select
              value={form.estado}
              onValueChange={(v) => {
                const estado = v as EstadoCuota;
                setForm((f) => ({
                  ...f,
                  estado,
                  ...(estado === 'pendiente' ? { fechaPagoReal: '' } : {}),
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PagarCuotaDialog({
  cuota,
  moneda,
  onClose,
  onSaved,
}: {
  cuota: CuotaInteres;
  moneda: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const saldoPendiente = cuota.montoPago - cuota.montoPagado;
  const [montoStr, setMontoStr] = useState(String(saldoPendiente));
  const [monto, setMonto] = useState(saldoPendiente);
  const [fecha, setFecha] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const excedente = Math.max(0, monto - saldoPendiente);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (monto <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await prestamosService.pagarCuota(cuota.id, {
        monto,
        fechaPago: fecha,
      });
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pagar cuota {cuota.mesNumero}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md bg-muted/50 border border-border p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monto cuota</span>
              <span className="font-mono font-semibold">{formatMonto(cuota.montoPago, moneda)}</span>
            </div>
            {cuota.montoPagado > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ya pagado</span>
                <span className="font-mono text-success">{formatMonto(cuota.montoPagado, moneda)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Saldo pendiente</span>
              <span className="font-mono">{formatMonto(saldoPendiente, moneda)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vencimiento</span>
              <span>{formatDate(cuota.fechaVencimiento)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Monto a pagar</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={montoStr}
              onChange={(e) => {
                setMontoStr(e.target.value);
                const num = parseFloat(e.target.value.replace(',', '.'));
                if (!isNaN(num) && num >= 0) setMonto(num);
              }}
            />
            {excedente > 0 && (
              <p className="text-xs text-blue-400">
                El excedente de {formatMonto(excedente, moneda)} se aplicará a la(s) siguiente(s) cuota(s)
              </p>
            )}
            {monto > 0 && monto < saldoPendiente && (
              <p className="text-xs text-warning">
                Pago parcial — quedarán {formatMonto(saldoPendiente - monto, moneda)} pendientes
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Fecha de pago</Label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
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
            <Button type="submit" disabled={saving || monto <= 0}>
              {saving ? 'Registrando...' : 'Confirmar pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PagosCuotaDetail({
  cuotaId,
  moneda,
  editable = true,
  onChanged,
}: {
  cuotaId: number;
  moneda: string;
  editable?: boolean;
  onChanged: () => void;
}) {
  const [pagos, setPagos] = useState<PagoCuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPago, setEditPago] = useState<PagoCuota | null>(null);

  const loadPagos = () => {
    prestamosService.getPagosByCuota(cuotaId)
      .then(setPagos)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPagos(); }, [cuotaId]);

  const handleDelete = async (pagoId: number) => {
    if (!confirm('¿Eliminar este pago? Se recalculará la cuota.')) return;
    await prestamosService.deletePago(pagoId);
    loadPagos();
    onChanged();
  };

  if (loading) return <p className="text-xs text-muted-foreground py-1">Cargando pagos...</p>;
  if (pagos.length === 0) return null;

  return (
    <div className="mt-1 space-y-1">
      {pagos.map((p) => (
        <div key={p.id} className="flex items-center justify-between text-xs bg-muted/30 rounded px-3 py-1.5">
          <span className="text-muted-foreground">{formatDate(p.fechaPago)}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">{formatMonto(p.monto, moneda)}</span>
            {editable && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => setEditPago(p)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive"
                  onClick={() => handleDelete(p.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      ))}

      {editPago && (
        <EditPagoDialog
          pago={editPago}
          onClose={() => setEditPago(null)}
          onSaved={() => { setEditPago(null); loadPagos(); onChanged(); }}
        />
      )}
    </div>
  );
}

function EditPagoDialog({
  pago,
  onClose,
  onSaved,
}: {
  pago: PagoCuota;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [montoStr, setMontoStr] = useState(String(pago.monto));
  const [monto, setMonto] = useState(pago.monto);
  const [fecha, setFecha] = useState(pago.fechaPago.split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await prestamosService.updatePago(pago.id, { monto, fechaPago: fecha });
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Editar pago</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Monto</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={montoStr}
              onChange={(e) => {
                setMontoStr(e.target.value);
                const num = parseFloat(e.target.value.replace(',', '.'));
                if (!isNaN(num) && num >= 0) setMonto(num);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DevolverCapitalDialog({
  prestamo,
  onClose,
  onSaved,
}: {
  prestamo: Prestamo;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fecha, setFecha] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cuotasPendientes = (prestamo.cuotas ?? []).filter((c) => c.estado === 'pendiente');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await prestamosService.update(prestamo.id, {
        estado: 'devuelto',
        fechaDevolucion: fecha,
      });
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Devolver capital</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md bg-muted/50 border border-border p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capital a devolver</span>
              <span className="font-mono font-semibold text-destructive">
                {formatMonto(prestamo.montoInicial, prestamo.moneda)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cuotas pendientes</span>
              <span className={cuotasPendientes.length > 0 ? 'text-orange-400' : 'text-success'}>
                {cuotasPendientes.length === 0 ? '✓ Todas pagadas' : `${cuotasPendientes.length} sin pagar`}
              </span>
            </div>
          </div>

          {cuotasPendientes.length > 0 && (
            <div className="flex items-start gap-2 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-md p-3">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Hay {cuotasPendientes.length} cuota{cuotasPendientes.length > 1 ? 's' : ''} de interés sin pagar.
              Podés igualmente registrar la devolución.
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Fecha de devolución</Label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
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
              {saving ? 'Cerrando...' : 'Confirmar devolución'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

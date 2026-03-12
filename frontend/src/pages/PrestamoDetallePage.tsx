import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit2,
  TrendingUp,
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
import { dashboardService } from '@/services/dashboard.service';
import { formatMonto, formatDate, formatTasa, diasHastaVencimiento } from '@/lib/format';
import type {
  Prestamo,
  CuotaInteres,
  ResumenPrestamo,
  UpdateCuotaDto,
  EstadoCuota,
} from '@/types';

export function PrestamoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [prestamo, setPrestamo] = useState<Prestamo | null>(null);
  const [resumen, setResumen] = useState<ResumenPrestamo | null>(null);
  const [ganancia, setGanancia] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editCuota, setEditCuota] = useState<CuotaInteres | null>(null);

  const load = () => {
    if (!id) return;
    Promise.all([
      prestamosService.getOne(id),
      prestamosService.getResumen(id),
      dashboardService.getGanancia(id).catch(() => null),
    ]).then(([p, r, g]) => {
      setPrestamo(p);
      setResumen(r);
      if (g) setGanancia(g.gananciaTradingPorMoneda);
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
            ).toISOString(),
          )}
        />
      </div>

      {/* Resumen financiero */}
      {resumen && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Resumen financiero
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
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
            {ganancia && (
              <>
                {Object.entries(ganancia).map(([moneda, monto]) => (
                  <div key={moneda}>
                    <p className="text-muted-foreground mb-0.5">
                      Ganancia trading ({moneda})
                    </p>
                    <p className={`font-mono font-semibold ${monto >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {monto >= 0 ? '+' : ''}{monto.toFixed(2)} {moneda}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

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
            {(prestamo.cuotas ?? []).map((cuota) => {
              const dias = diasHastaVencimiento(cuota.fechaVencimiento);
              const vencida = cuota.estado === 'pendiente' && dias < 0;
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditCuota(cuota)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
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
    </div>
  );
}

function InfoCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

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
        ...(form.fechaPagoReal ? { fechaPagoReal: form.fechaPagoReal } : {}),
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
              onValueChange={(v) => setForm((f) => ({ ...f, estado: v as EstadoCuota }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
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

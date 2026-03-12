import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Trash2, AlertTriangle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
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
import { prestamosService } from '@/services/prestamos.service';
import { monedasService, type MonedaItem } from '@/services/monedas.service';
import { formatMonto, formatDate, formatTasa } from '@/lib/format';
import type { Prestamo, CreatePrestamoDto, TasaTipo, EstadoPrestamo } from '@/types';

const ESTADO_BADGE: Record<EstadoPrestamo, { label: string; variant: 'default' | 'success' | 'destructive' | 'secondary' }> = {
  activo: { label: 'Activo', variant: 'default' },
  devuelto: { label: 'Devuelto', variant: 'success' },
  vencido: { label: 'Vencido', variant: 'destructive' },
};

export function PrestamosPage() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [monedas, setMonedas] = useState<MonedaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    prestamosService
      .getAll()
      .then(setPrestamos)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    monedasService.getAll().then(setMonedas);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este préstamo? Esta acción no se puede deshacer.')) return;
    setDeleting(id);
    try {
      await prestamosService.delete(id);
      load();
    } finally {
      setDeleting(null);
    }
  };

  const filtered = prestamos.filter(
    (p) =>
      p.cliente.toLowerCase().includes(search.toLowerCase()) ||
      p.moneda.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Préstamos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {prestamos.length} préstamo{prestamos.length !== 1 ? 's' : ''} registrado
            {prestamos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo préstamo
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente o moneda..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Capital</TableHead>
              <TableHead>Tasa</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
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
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  {search ? 'Sin resultados para esa búsqueda' : 'Sin préstamos registrados'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((p) => {
              const { label, variant } = ESTADO_BADGE[p.estado];
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.cliente}</TableCell>
                  <TableCell className="font-mono">
                    {formatMonto(p.montoInicial, p.moneda)}
                  </TableCell>
                  <TableCell>
                    {formatTasa(p.tasaInicial, p.tasaTipo)}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({p.tasaTipo === 'porcentaje' ? '%' : 'fijo'}/mes)
                    </span>
                  </TableCell>
                  <TableCell>{p.plazoMeses} mes{p.plazoMeses !== 1 ? 'es' : ''}</TableCell>
                  <TableCell>{formatDate(p.fechaInicio)}</TableCell>
                  <TableCell>
                    <Badge variant={variant}>{label}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link to={`/prestamos/${p.id}`}>
                        <Button variant="ghost" size="icon" title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar"
                        className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                        disabled={deleting === p.id}
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {showForm && (
        <NuevoPrestamoDialog
          monedas={monedas}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

// ── Formulario nuevo préstamo ────────────────────────────────────────────────

function NuevoPrestamoDialog({ monedas, onClose, onCreated }: { monedas: MonedaItem[]; onClose: () => void; onCreated: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState<CreatePrestamoDto>({
    cliente: '',
    montoInicial: 0,
    moneda: 'ARS',
    fechaInicio: today,
    plazoMeses: 6,
    tasaTipo: 'porcentaje',
    tasaInicial: 1,
  });
  // Strings locales para inputs decimales (evita que "0.xxx" se borre al tipear el 0)
  const [montoStr, setMontoStr] = useState('');
  const [tasaStr, setTasaStr] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof CreatePrestamoDto, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const parseDecimal = (v: string) => parseFloat(v.replace(',', '.'));

  const handleMontoChange = (v: string) => {
    setMontoStr(v);
    const num = parseDecimal(v);
    if (!isNaN(num) && num >= 0) set('montoInicial', num);
  };

  const handleTasaChange = (v: string) => {
    setTasaStr(v);
    const num = parseDecimal(v);
    if (!isNaN(num) && num >= 0) set('tasaInicial', num);
  };

  // Calcular cuota preview
  const cuotaPreview =
    form.tasaTipo === 'porcentaje'
      ? (form.montoInicial * form.tasaInicial) / 100
      : form.tasaInicial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.cliente.trim()) return setError('El nombre del cliente es obligatorio');
    if (form.montoInicial <= 0) return setError('El monto debe ser mayor a 0');
    if (form.tasaInicial <= 0) return setError('La tasa debe ser mayor a 0');
    setSaving(true);
    try {
      await prestamosService.create(form);
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear préstamo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar nuevo préstamo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cliente">Prestamista (quien te da el dinero)</Label>
            <Input
              id="cliente"
              placeholder="Nombre o alias"
              value={form.cliente}
              onChange={(e) => set('cliente', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Monto recibido</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={montoStr}
                onChange={(e) => handleMontoChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={form.moneda} onValueChange={(v) => set('moneda', v as Moneda)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monedas.map((m) => (
                    <SelectItem key={m.codigo} value={m.codigo}>
                      {m.codigo} — {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de tasa</Label>
              <Select
                value={form.tasaTipo}
                onValueChange={(v) => set('tasaTipo', v as TasaTipo)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="porcentaje">Porcentaje mensual (%)</SelectItem>
                  <SelectItem value="fijo">Monto fijo mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                {form.tasaTipo === 'porcentaje' ? 'Tasa (%)' : `Monto fijo (${form.moneda})`}
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={tasaStr}
                onChange={(e) => handleTasaChange(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha de inicio</Label>
              <Input
                type="date"
                value={form.fechaInicio}
                onChange={(e) => set('fechaInicio', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Plazo (meses)</Label>
              <Input
                type="number"
                min="1"
                value={form.plazoMeses}
                onChange={(e) => set('plazoMeses', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Preview de cuota */}
          {form.montoInicial > 0 && (
            <div className="rounded-md bg-muted/50 border border-border p-3 text-sm">
              <p className="text-muted-foreground mb-1">Vista previa de cuota mensual:</p>
              <p className="font-semibold font-mono">
                {formatMonto(cuotaPreview, form.moneda)} / mes × {form.plazoMeses} meses ={' '}
                {formatMonto(cuotaPreview * form.plazoMeses, form.moneda)} total
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="Condiciones especiales, garantías, etc."
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
              {saving ? 'Registrando...' : 'Registrar préstamo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

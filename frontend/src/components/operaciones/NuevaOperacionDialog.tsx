import { useState } from 'react';
import { ArrowRight, Receipt, ArrowDownToLine, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { operacionesService } from '@/services/operaciones.service';
import type { MonedaItem } from '@/services/monedas.service';
import { todayStr } from '@/lib/format';
import type { CreateOperacionDto, Moneda } from '@/types';
import { FormCambio, type FormCambioState } from './FormCambio';
import { FormGasto } from './FormGasto';
import { FormIngreso } from './FormIngreso';
import {
  esPorPorcentaje,
  derivarTipo,
  nowHora,
} from './operaciones-helpers';

type ModoFormulario = 'cambio' | 'gasto' | 'ingreso';

const MODOS: { key: ModoFormulario; label: string; icon: React.ReactNode }[] = [
  { key: 'cambio', label: 'Cambio de divisa', icon: <ArrowRight className="h-3.5 w-3.5" /> },
  { key: 'gasto', label: 'Gasto', icon: <Receipt className="h-3.5 w-3.5" /> },
  { key: 'ingreso', label: 'Ingreso / Cobro', icon: <ArrowDownToLine className="h-3.5 w-3.5" /> },
];

interface NuevaOperacionDialogProps {
  monedas: MonedaItem[];
  capitalPorMoneda: Record<string, number>;
  onClose: () => void;
  onCreated: () => void;
}

export function NuevaOperacionDialog({
  monedas,
  capitalPorMoneda,
  onClose,
  onCreated,
}: NuevaOperacionDialogProps) {
  const today = todayStr();

  const monedasOrdenadas = [...monedas].sort(
    (a, b) => (capitalPorMoneda[b.codigo] ?? 0) - (capitalPorMoneda[a.codigo] ?? 0),
  );
  const primeraConBalance = monedasOrdenadas[0]?.codigo ?? 'ARS';
  const segundaDistinta =
    monedasOrdenadas.find((m) => m.codigo !== primeraConBalance)?.codigo ?? 'USDT';

  // ── Estado modo ──
  const [modo, setModo] = useState<ModoFormulario>('cambio');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Estado cambio ──
  const [form, setForm] = useState<FormCambioState>({
    monedaOrigen: primeraConBalance,
    monedaDestino: segundaDistinta,
    montoOrigen: capitalPorMoneda[primeraConBalance] ?? 0,
    tasaCambio: 0,
    montoDestino: 0,
    fecha: today,
  });
  const [cambioHora, setCambioHora] = useState(nowHora());
  const [porcentaje, setPorcentaje] = useState(0);
  const [porcentajeRaw, setPorcentajeRaw] = useState('');

  // ── Estado gasto ──
  const [gastoMoneda, setGastoMoneda] = useState(primeraConBalance);
  const [gastoMonto, setGastoMonto] = useState(0);
  const [gastoNotas, setGastoNotas] = useState('');
  const [gastoFecha, setGastoFecha] = useState(today);
  const [gastoHora, setGastoHora] = useState(nowHora());

  // ── Estado ingreso ──
  const [ingresoMoneda, setIngresoMoneda] = useState(primeraConBalance);
  const [ingresoMonto, setIngresoMonto] = useState(0);
  const [ingresoNotas, setIngresoNotas] = useState('');
  const [ingresoFecha, setIngresoFecha] = useState(today);
  const [ingresoHora, setIngresoHora] = useState(nowHora());

  // ── Helpers de cálculo ──
  const set = (field: keyof FormCambioState, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const usarPorcentaje = esPorPorcentaje(form.monedaOrigen, form.monedaDestino);

  const calcDestino = (origen: number, tasa: number, origenM: string, destinoM: string) => {
    if (tasa <= 0 && !esPorPorcentaje(origenM, destinoM)) return 0;
    if (origenM === 'ARS') return origen / tasa;
    return origen * tasa;
  };

  const handleMonedaOrigenChange = (moneda: Moneda) => {
    const capital = capitalPorMoneda[moneda] ?? 0;
    const nuevoDestino =
      form.monedaDestino === moneda
        ? monedas.find((m) => m.codigo !== moneda)?.codigo ?? form.monedaDestino
        : form.monedaDestino;
    const nuevaEsPct = esPorPorcentaje(moneda, nuevoDestino);
    const tasa = nuevaEsPct ? 1 + porcentaje / 100 : form.tasaCambio;
    const destino = nuevaEsPct
      ? capital * (1 + porcentaje / 100)
      : calcDestino(capital, form.tasaCambio, moneda, nuevoDestino);
    setForm((f) => ({
      ...f,
      monedaOrigen: moneda,
      monedaDestino: nuevoDestino,
      montoOrigen: capital,
      tasaCambio: tasa,
      montoDestino: destino,
    }));
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

  const handlePorcentajeChange = (raw: string) => {
    setPorcentajeRaw(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && raw !== '-' && !raw.endsWith('.') && !raw.endsWith(',')) {
      const tasa = 1 + parsed / 100;
      setPorcentaje(parsed);
      setForm((f) => ({ ...f, tasaCambio: tasa, montoDestino: f.montoOrigen * tasa }));
    }
  };

  const handleMontoDestinoChange = (v: number) => {
    setForm((f) => ({ ...f, montoDestino: v }));
    if (form.montoOrigen <= 0 || v <= 0) return;
    if (usarPorcentaje) {
      const tasa = v / form.montoOrigen;
      const pct = (tasa - 1) * 100;
      setPorcentaje(pct);
      setPorcentajeRaw(pct.toFixed(4).replace(/\.?0+$/, ''));
      setForm((f) => ({ ...f, tasaCambio: tasa, montoDestino: v }));
    } else {
      const tasa = form.monedaOrigen === 'ARS' ? form.montoOrigen / v : v / form.montoOrigen;
      setForm((f) => ({ ...f, tasaCambio: tasa, montoDestino: v }));
    }
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

  // ── Submit ──
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
          hora: cambioHora,
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
          hora: gastoHora,
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
          hora: ingresoHora,
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

  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar operación</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {modo === 'cambio' && (
            <FormCambio
              form={form}
              hora={cambioHora}
              porcentaje={porcentaje}
              porcentajeRaw={porcentajeRaw}
              monedas={monedas}
              monedasOrdenadas={monedasOrdenadas}
              monedasDestino={monedasDestino}
              capitalPorMoneda={capitalPorMoneda}
              onFechaChange={(v) => set('fecha', v)}
              onHoraChange={setCambioHora}
              onMonedaOrigenChange={handleMonedaOrigenChange}
              onMontoOrigenChange={handleMontoOrigenChange}
              onMonedaDestinoChange={handleMonedaDestinoChange}
              onMontoDestinoChange={handleMontoDestinoChange}
              onTasaChange={handleTasaChange}
              onPorcentajeChange={handlePorcentajeChange}
              onNotasChange={(v) => set('notas', v)}
            />
          )}

          {modo === 'gasto' && (
            <FormGasto
              moneda={gastoMoneda}
              monto={gastoMonto}
              notas={gastoNotas}
              fecha={gastoFecha}
              hora={gastoHora}
              monedas={monedas}
              onMonedaChange={setGastoMoneda}
              onMontoChange={setGastoMonto}
              onNotasChange={setGastoNotas}
              onFechaChange={setGastoFecha}
              onHoraChange={setGastoHora}
            />
          )}

          {modo === 'ingreso' && (
            <FormIngreso
              moneda={ingresoMoneda}
              monto={ingresoMonto}
              notas={ingresoNotas}
              fecha={ingresoFecha}
              hora={ingresoHora}
              monedas={monedas}
              onMonedaChange={setIngresoMoneda}
              onMontoChange={setIngresoMonto}
              onNotasChange={setIngresoNotas}
              onFechaChange={setIngresoFecha}
              onHoraChange={setIngresoHora}
            />
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

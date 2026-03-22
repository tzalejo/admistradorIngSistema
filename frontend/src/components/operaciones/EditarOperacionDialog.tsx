import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
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
import type { Operacion, Moneda } from '@/types';
import { FormCambio, type FormCambioState } from './FormCambio';
import { FormGasto } from './FormGasto';
import { FormIngreso } from './FormIngreso';
import { esPorPorcentaje, derivarTipo } from './operaciones-helpers';

type ModoFormulario = 'cambio' | 'gasto' | 'ingreso';

function modoDesdeOperacion(op: Operacion): ModoFormulario {
  if (op.tipo === 'gasto') return 'gasto';
  if (op.tipo === 'ingreso') return 'ingreso';
  return 'cambio';
}

interface EditarOperacionDialogProps {
  operacion: Operacion;
  monedas: MonedaItem[];
  capitalPorMoneda: Record<string, number>;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditarOperacionDialog({
  operacion,
  monedas,
  capitalPorMoneda,
  onClose,
  onUpdated,
}: EditarOperacionDialogProps) {
  const modo = modoDesdeOperacion(operacion);

  // ── Estado cambio ──
  const [form, setForm] = useState<FormCambioState>({
    monedaOrigen: operacion.monedaOrigen,
    monedaDestino: operacion.monedaDestino ?? '',
    montoOrigen: Number(operacion.montoOrigen),
    tasaCambio: Number(operacion.tasaCambio ?? 0),
    montoDestino: Number(operacion.montoDestino ?? 0),
    fecha: operacion.fecha.slice(0, 10),
    notas: operacion.notas ?? '',
  });
  const [cambioHora, setCambioHora] = useState(operacion.hora?.slice(0, 5) ?? '');

  const initialPct = operacion.tasaCambio
    ? (Number(operacion.tasaCambio) - 1) * 100
    : 0;
  const [porcentaje, setPorcentaje] = useState(initialPct);
  const [porcentajeRaw, setPorcentajeRaw] = useState(
    initialPct !== 0 ? initialPct.toFixed(4).replace(/\.?0+$/, '') : '',
  );

  // ── Estado gasto ──
  const [gastoMoneda, setGastoMoneda] = useState(operacion.monedaOrigen);
  const [gastoMonto, setGastoMonto] = useState(Number(operacion.montoOrigen));
  const [gastoNotas, setGastoNotas] = useState(operacion.notas ?? '');
  const [gastoFecha, setGastoFecha] = useState(operacion.fecha.slice(0, 10));
  const [gastoHora, setGastoHora] = useState(operacion.hora?.slice(0, 5) ?? '');

  // ── Estado ingreso ──
  const [ingresoMoneda, setIngresoMoneda] = useState(operacion.monedaOrigen);
  const [ingresoMonto, setIngresoMonto] = useState(Number(operacion.montoOrigen));
  const [ingresoNotas, setIngresoNotas] = useState(operacion.notas ?? '');
  const [ingresoFecha, setIngresoFecha] = useState(operacion.fecha.slice(0, 10));
  const [ingresoHora, setIngresoHora] = useState(operacion.hora?.slice(0, 5) ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (modo === 'cambio') {
        if (form.montoOrigen <= 0) { setError('El monto debe ser mayor a 0'); return; }
        if (!usarPorcentaje && form.tasaCambio <= 0) { setError('La tasa de cambio debe ser mayor a 0'); return; }
        if (form.monedaOrigen === form.monedaDestino) { setError('Las monedas deben ser distintas'); return; }
        await operacionesService.update(operacion.id, {
          tipo: derivarTipo(form.monedaOrigen),
          monedaOrigen: form.monedaOrigen,
          monedaDestino: form.monedaDestino,
          montoOrigen: form.montoOrigen,
          tasaCambio: form.tasaCambio,
          montoDestino: form.montoDestino,
          fecha: form.fecha,
          hora: cambioHora,
          notas: form.notas,
        });
      } else if (modo === 'gasto') {
        if (gastoMonto <= 0) { setError('El monto debe ser mayor a 0'); return; }
        if (!gastoNotas.trim()) { setError('Ingresá un concepto para el gasto'); return; }
        await operacionesService.update(operacion.id, {
          tipo: 'gasto',
          monedaOrigen: gastoMoneda,
          montoOrigen: gastoMonto,
          fecha: gastoFecha,
          hora: gastoHora,
          notas: gastoNotas,
        });
      } else if (modo === 'ingreso') {
        if (ingresoMonto <= 0) { setError('El monto debe ser mayor a 0'); return; }
        if (!ingresoNotas.trim()) { setError('Ingresá un concepto para el ingreso'); return; }
        await operacionesService.update(operacion.id, {
          tipo: 'ingreso',
          monedaOrigen: ingresoMoneda,
          montoOrigen: ingresoMonto,
          fecha: ingresoFecha,
          hora: ingresoHora,
          notas: ingresoNotas,
        });
      }

      onUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const monedasOrdenadas = [...monedas].sort(
    (a, b) => (capitalPorMoneda[b.codigo] ?? 0) - (capitalPorMoneda[a.codigo] ?? 0),
  );
  const monedasDestino = monedas.filter((m) => m.codigo !== form.monedaOrigen);

  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar operación</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

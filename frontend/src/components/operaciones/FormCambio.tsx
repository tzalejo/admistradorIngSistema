import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatMonto } from '@/lib/format';
import type { MonedaItem } from '@/services/monedas.service';
import type { Moneda } from '@/types';
import { MoneyInput } from './MoneyInput';
import { esPorPorcentaje } from './operaciones-helpers';

export interface FormCambioState {
  monedaOrigen: string;
  monedaDestino: string;
  montoOrigen: number;
  tasaCambio: number;
  montoDestino: number;
  fecha: string;
  notas?: string;
}

interface FormCambioProps {
  form: FormCambioState;
  hora: string;
  porcentaje: number;
  porcentajeRaw: string;
  monedas: MonedaItem[];
  monedasOrdenadas: MonedaItem[];
  monedasDestino: MonedaItem[];
  capitalPorMoneda: Record<string, number>;
  onFechaChange: (v: string) => void;
  onHoraChange: (v: string) => void;
  onMonedaOrigenChange: (v: Moneda) => void;
  onMontoOrigenChange: (v: number) => void;
  onMonedaDestinoChange: (v: string) => void;
  onMontoDestinoChange: (v: number) => void;
  onTasaChange: (v: number) => void;
  onPorcentajeChange: (raw: string) => void;
  onNotasChange: (v: string) => void;
}

export function FormCambio({
  form,
  hora,
  porcentaje,
  porcentajeRaw,
  monedasOrdenadas,
  monedasDestino,
  capitalPorMoneda,
  onFechaChange,
  onHoraChange,
  onMonedaOrigenChange,
  onMontoOrigenChange,
  onMonedaDestinoChange,
  onMontoDestinoChange,
  onTasaChange,
  onPorcentajeChange,
  onNotasChange,
}: FormCambioProps) {
  const usarPorcentaje = esPorPorcentaje(form.monedaOrigen, form.monedaDestino);
  const balanceOrigen = capitalPorMoneda[form.monedaOrigen] ?? 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Fecha</Label>
          <Input type="date" value={form.fecha} onChange={(e) => onFechaChange(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Hora</Label>
          <Input type="time" value={hora} onChange={(e) => onHoraChange(e.target.value)} />
        </div>
      </div>

      <div className="rounded-md border border-border p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entrego</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={form.monedaOrigen} onValueChange={(v) => onMonedaOrigenChange(v as Moneda)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {monedasOrdenadas.map((m) => {
                  const bal = capitalPorMoneda[m.codigo] ?? 0;
                  return (
                    <SelectItem key={m.codigo} value={m.codigo}>
                      <span className="flex items-center gap-2">
                        <span>{m.codigo}</span>
                        {bal > 0 && (
                          <span className="text-xs text-success font-mono">
                            {formatMonto(bal, m.codigo as Moneda)}
                          </span>
                        )}
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
            <MoneyInput value={form.montoOrigen} onChange={onMontoOrigenChange} />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recibo</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={form.monedaDestino} onValueChange={onMonedaDestinoChange}>
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
            <MoneyInput value={form.montoDestino} onChange={onMontoDestinoChange} />
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
              value={porcentajeRaw}
              onChange={(e) => onPorcentajeChange(e.target.value)}
              className="pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">%</span>
          </div>
          {form.montoOrigen > 0 && (
            <p className="text-xs text-muted-foreground font-mono">
              Tasa efectiva: {(1 + porcentaje / 100).toFixed(6)} · Recibís:{' '}
              {formatMonto(form.montoDestino, form.monedaDestino as Moneda)}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label>
            Tasa de cambio
            <span className="ml-1 text-xs text-muted-foreground font-normal">
              ({form.monedaOrigen} / {form.monedaDestino})
            </span>
          </Label>
          <Input
            type="number" min="0" step="any" placeholder="ej: 1450"
            value={form.tasaCambio || ''}
            onChange={(e) => onTasaChange(parseFloat(e.target.value) || 0)}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Notas (opcional)</Label>
        <Textarea
          placeholder="Plataforma, contraparte, etc."
          value={form.notas ?? ''}
          onChange={(e) => onNotasChange(e.target.value)}
          rows={2}
        />
      </div>
    </>
  );
}

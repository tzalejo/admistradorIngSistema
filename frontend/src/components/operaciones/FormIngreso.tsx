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
import type { MonedaItem } from '@/services/monedas.service';
import { MoneyInput } from './MoneyInput';

interface FormIngresoProps {
  moneda: string;
  monto: number;
  notas: string;
  fecha: string;
  hora: string;
  monedas: MonedaItem[];
  onMonedaChange: (v: string) => void;
  onMontoChange: (v: number) => void;
  onNotasChange: (v: string) => void;
  onFechaChange: (v: string) => void;
  onHoraChange: (v: string) => void;
}

export function FormIngreso({
  moneda,
  monto,
  notas,
  fecha,
  hora,
  monedas,
  onMonedaChange,
  onMontoChange,
  onNotasChange,
  onFechaChange,
  onHoraChange,
}: FormIngresoProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Fecha</Label>
          <Input type="date" value={fecha} onChange={(e) => onFechaChange(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Hora</Label>
          <Input type="time" value={hora} onChange={(e) => onHoraChange(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Moneda</Label>
          <Select value={moneda} onValueChange={onMonedaChange}>
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
          <MoneyInput value={monto} onChange={onMontoChange} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Concepto / Servicio</Label>
        <Textarea
          placeholder="Ej: Consultoría, Desarrollo web, Trabajo X..."
          value={notas}
          onChange={(e) => onNotasChange(e.target.value)}
          rows={2}
        />
      </div>
    </>
  );
}

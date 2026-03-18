import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS_HEADER = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

function diasEnMes(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function primerDiaSemana(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0 = domingo
}

function toStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function fmtDisplay(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function todayISO() {
  const t = new Date();
  return toStr(t.getFullYear(), t.getMonth(), t.getDate());
}

// ── CalendarMonth ─────────────────────────────────────────────────────────────

function CalendarMonth({
  year,
  month,
  desde,
  hasta,
  hover,
  onDayClick,
  onDayHover,
}: {
  year: number;
  month: number;
  desde: string;
  hasta: string;
  hover: string;
  onDayClick: (d: string) => void;
  onDayHover: (d: string) => void;
}) {
  const total = diasEnMes(year, month);
  const offset = primerDiaSemana(year, month);
  const today = todayISO();

  // Rango visual efectivo (incluye hover si todavía no hay hasta)
  const seleccionando = !!desde && !hasta;
  const visualEnd = seleccionando
    ? hover && hover > desde ? hover : ''
    : hasta;

  const cells: React.ReactNode[] = [];

  for (let i = 0; i < offset; i++) {
    cells.push(<div key={`e${i}`} />);
  }

  for (let day = 1; day <= total; day++) {
    const d = toStr(year, month, day);
    const isStart = d === desde;
    const isEnd = d === (hasta || (seleccionando && hover > desde ? hover : ''));
    const inRange = !!(desde && visualEnd && d > desde && d < visualEnd);
    const isToday = d === today;

    // Background strip (la banda continua del rango)
    const stripClass = cn(
      'relative flex items-center justify-center h-9 w-full',
      inRange && 'bg-primary/15',
      isStart && visualEnd && !isEnd && 'bg-gradient-to-r from-transparent to-primary/15',
      isEnd && !isStart && 'bg-gradient-to-l from-transparent to-primary/15',
    );

    // Círculo del día
    const circleClass = cn(
      'z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm cursor-pointer select-none transition-colors',
      (isStart || isEnd) && 'bg-primary text-primary-foreground font-semibold',
      !isStart && !isEnd && !inRange && 'hover:bg-muted',
      !isStart && !isEnd && inRange && 'hover:bg-primary/30',
      isToday && !isStart && !isEnd && 'ring-1 ring-primary text-primary font-semibold',
    );

    cells.push(
      <div key={day} className={stripClass}>
        <div
          className={circleClass}
          onClick={() => onDayClick(d)}
          onMouseEnter={() => onDayHover(d)}
        >
          {day}
        </div>
      </div>,
    );
  }

  return (
    <div className="w-[224px] space-y-2">
      <p className="text-center text-sm font-semibold">
        {MESES[month]} {year}
      </p>
      <div className="grid grid-cols-7">
        {DIAS_HEADER.map((d) => (
          <div
            key={d}
            className="flex h-8 w-full items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells}
      </div>
    </div>
  );
}

// ── DateRangePicker ───────────────────────────────────────────────────────────

interface DateRangePickerProps {
  desde: string;
  hasta: string;
  onChange: (desde: string, hasta: string) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({
  desde,
  hasta,
  onChange,
  placeholder = 'Seleccionar rango',
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // El mes inicial muestra el mes de "desde" o el mes actual
  const now = new Date();
  const [viewYear, setViewYear] = useState(
    desde ? parseInt(desde.slice(0, 4)) : now.getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    desde ? parseInt(desde.slice(5, 7)) - 1 : now.getMonth(),
  );

  // Segundo mes: siguiente al primero
  const month2 = viewMonth === 11 ? 0 : viewMonth + 1;
  const year2 = viewMonth === 11 ? viewYear + 1 : viewYear;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setHover('');
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const handleDayClick = (d: string) => {
    if (!desde || (desde && hasta)) {
      // Empieza selección nueva
      onChange(d, '');
    } else {
      // Ya hay inicio, ahora se elige el fin
      if (d === desde) {
        onChange('', '');
      } else if (d < desde) {
        onChange(d, desde);
        setOpen(false);
        setHover('');
      } else {
        onChange(desde, d);
        setOpen(false);
        setHover('');
      }
    }
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
    setHover('');
  };

  // Label del botón
  const label =
    desde || hasta
      ? `${fmtDisplay(desde) || '…'} → ${fmtDisplay(hasta) || '…'}`
      : placeholder;

  // Estado de selección para el hint
  const seleccionando = !!desde && !hasta;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 h-9 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-muted/50 whitespace-nowrap',
          open && 'ring-1 ring-ring',
          desde || hasta ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        <Calendar className="h-4 w-4 shrink-0text-muted-foreground" />
        <span>{label}</span>
        {(desde || hasta) && (
          <X
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground ml-1"
            onClick={clear}
          />
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 rounded-xl border border-border bg-card p-4 shadow-xl left-0">
          {/* Navegación */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded p-1 transition-colors hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded p-1 transition-colors hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Dos meses */}
          <div
            className="flex gap-6"
            onMouseLeave={() => setHover('')}
          >
            <CalendarMonth
              year={viewYear}
              month={viewMonth}
              desde={desde}
              hasta={hasta}
              hover={hover}
              onDayClick={handleDayClick}
              onDayHover={setHover}
            />
            <div className="w-px bg-border" />
            <CalendarMonth
              year={year2}
              month={month2}
              desde={desde}
              hasta={hasta}
              hover={hover}
              onDayClick={handleDayClick}
              onDayHover={setHover}
            />
          </div>

          {/* Hint / resumen */}
          <div className="mt-3 border-t border-border pt-3 flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              {seleccionando
                ? 'Ahora seleccioná la fecha de fin'
                : desde && hasta
                ? `${fmtDisplay(desde)} → ${fmtDisplay(hasta)}`
                : 'Seleccioná la fecha de inicio'}
            </p>
            {(desde || hasta) && (
              <button
                type="button"
                onClick={() => { onChange('', ''); setHover(''); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

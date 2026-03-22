import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { parseMoney } from './operaciones-helpers';

export function MoneyInput({
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

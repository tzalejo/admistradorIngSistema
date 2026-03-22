import { memo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HandCoins,
  ArrowUpRight,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboardService } from '@/services/dashboard.service';
import { formatMonto, formatDate, diasHastaVencimiento } from '@/lib/format';
import type { ResumenDashboard, Moneda } from '@/types';

const MONEDAS: Moneda[] = ['ARS', 'USDT', 'USD', 'BTC'];

export function DashboardPage() {
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardService
      .getResumen()
      .then(setResumen)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!resumen) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Resumen de tu cartera de préstamos</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Préstamos activos"
          value={String(resumen.prestamosActivos)}
          icon={<HandCoins className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Operaciones totales"
          value={String(resumen.operacionesTotales)}
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Cuotas pendientes"
          value={String(resumen.proximasCuotas.length)}
          icon={<Clock className="h-4 w-4 text-warning" />}
        />
        <StatCard
          title="Vencen esta semana"
          value={String(
            resumen.proximasCuotas.filter(
              (c) => diasHastaVencimiento(c.fechaVencimiento) <= 7 && diasHastaVencimiento(c.fechaVencimiento) >= 0,
            ).length,
          )}
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
        />
      </div>

      {/* Capital por moneda */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">
            Capital en préstamos activos
          </h2>
          <div className="space-y-3">
            {MONEDAS.map((m) =>
              resumen.capitalTotalPorMoneda[m] > 0 ? (
                <div key={m} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{m}</span>
                  <span className="font-mono font-semibold">
                    {formatMonto(resumen.capitalTotalPorMoneda[m], m)}
                  </span>
                </div>
              ) : null,
            )}
            {MONEDAS.every((m) => resumen.capitalTotalPorMoneda[m] === 0) && (
              <p className="text-sm text-muted-foreground">Sin capital activo</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">
            Intereses pendientes de pago
          </h2>
          <div className="space-y-3">
            {MONEDAS.map((m) =>
              resumen.interesesPendientesPorMoneda[m] > 0 ? (
                <div key={m} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{m}</span>
                  <span className="font-mono font-semibold text-warning">
                    {formatMonto(resumen.interesesPendientesPorMoneda[m], m)}
                  </span>
                </div>
              ) : null,
            )}
            {MONEDAS.every((m) => resumen.interesesPendientesPorMoneda[m] === 0) && (
              <p className="text-sm text-muted-foreground">Sin intereses pendientes</p>
            )}
          </div>
        </div>
      </div>

      {/* Próximas cuotas */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Próximas cuotas a pagar</h2>
          <Link to="/prestamos">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              Ver préstamos <ArrowUpRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        <div className="divide-y divide-border">
          {resumen.proximasCuotas.length === 0 && (
            <div className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              No hay cuotas pendientes próximas
            </div>
          )}
          {resumen.proximasCuotas.map((cuota) => {
            const dias = diasHastaVencimiento(cuota.fechaVencimiento);
            const urgente = dias <= 3;
            const proximo = dias <= 7;
            return (
              <div
                key={cuota.cuotaId}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-2 w-2 rounded-full shrink-0 ${urgente ? 'bg-destructive' : proximo ? 'bg-warning' : 'bg-muted-foreground'}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{cuota.cliente}</p>
                    <p className="text-xs text-muted-foreground">
                      Cuota {cuota.mesNumero} · {formatDate(cuota.fechaVencimiento)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="font-mono text-sm font-semibold">
                    {formatMonto(cuota.montoPago, cuota.moneda)}
                  </span>
                  <Badge
                    variant={urgente ? 'destructive' : proximo ? 'warning' : 'outline'}
                    className="text-xs"
                  >
                    {dias === 0
                      ? 'Hoy'
                      : dias < 0
                        ? `${Math.abs(dias)}d vencida`
                        : `${dias}d`}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const StatCard = memo(function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
});

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-muted rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg" />
        ))}
      </div>
      <div className="h-48 bg-muted rounded-lg" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

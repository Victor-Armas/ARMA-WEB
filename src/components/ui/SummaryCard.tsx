import type { LucideIcon } from 'lucide-react';

type SummaryTone = 'green' | 'gold' | 'red' | 'neutral';

interface SummaryCardProps {
  label: string;
  value: string | number | null;
  icon: LucideIcon;
  tone?: SummaryTone;
}

const toneClasses: Record<SummaryTone, string> = {
  green: 'to-arma-green-soft text-arma-green before:bg-arma-green',
  gold: 'to-arma-gold-soft text-arma-gold before:bg-arma-gold',
  red: 'to-arma-red-soft text-arma-red before:bg-arma-red',
  neutral: 'to-arma-neutral-soft text-arma-neutral before:bg-arma-neutral',
};

export function SummaryCard({ label, value, icon: Icon, tone = 'neutral' }: SummaryCardProps) {
  return (
    <article className={`relative min-w-0 overflow-hidden rounded-arma border border-arma-border bg-linear-135 from-arma-surface from-25% p-5 shadow-arma-card before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[''] sm:p-6 ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium text-arma-muted">{label}</h2>
        <Icon aria-hidden="true" className="shrink-0" size={26} strokeWidth={1.6} />
      </div>
      {value === null ? (
        <p className="mt-5 text-sm text-arma-muted">Sin datos</p>
      ) : (
        <p className="mt-4 text-3xl font-semibold tracking-tight text-arma-text tabular-nums">{value}</p>
      )}
    </article>
  );
}

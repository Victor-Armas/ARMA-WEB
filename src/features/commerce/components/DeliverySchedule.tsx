import { CalendarDays } from 'lucide-react';
import type { DeliverySummary } from '../schemas/commerce.schema';
import { formatCalendarDate, todayInMonterrey, secondaryButton } from '../utils/commerce-format';

interface DeliveryScheduleProps { summary: DeliverySummary; selected: string; onSelect: (date: string) => void; }
export function DeliverySchedule({summary,selected,onSelect}: DeliveryScheduleProps) {
  const today=todayInMonterrey();
  return <section aria-labelledby="delivery-schedule-title" className="mt-7 border-y border-arma-border py-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="delivery-schedule-title" className="flex items-center gap-2 text-lg font-semibold"><CalendarDays size={20} strokeWidth={1.7} className="text-arma-active" aria-hidden="true"/>Próximas entregas</h2>{selected?<button type="button" onClick={()=>onSelect('')} className={secondaryButton}>Ver todas las fechas</button>:null}</div>
    <p className="mt-1 text-xs text-arma-muted">Apartados pendientes de entrega · siguientes siete fechas programadas. Incluye todos los resultados de la búsqueda.</p>
    <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
      {summary.scheduled.map(day=><button key={day.date} type="button" aria-pressed={selected===day.date} onClick={()=>onSelect(selected===day.date?'':day.date)} className={`min-h-28 min-w-40 shrink-0 rounded-arma border p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active ${selected===day.date?'border-arma-active bg-arma-primary-soft':'border-arma-border bg-arma-surface hover:bg-arma-primary-soft'}`}>
        <span className="block text-sm font-semibold">{day.date===today?'Hoy':formatCalendarDate(day.date)}</span>
        <span className="mt-2 block text-sm tabular-nums">{day.orders} {day.orders===1?'apartado':'apartados'}</span>
        <span className="mt-1 block text-xs text-arma-muted">{day.pieces} {day.pieces===1?'pieza por preparar':'piezas por preparar'}</span>
      </button>)}
      {!summary.scheduled.length?<p className="py-4 text-sm text-arma-muted">No hay entregas próximas programadas con estos filtros.</p>:null}
    </div>
    <div className="mt-3 flex flex-wrap gap-3">
      {summary.overdue_orders>0?<button type="button" aria-pressed={selected==='overdue'} onClick={()=>onSelect(selected==='overdue'?'':'overdue')} className={`${secondaryButton} border-arma-red/30 bg-arma-red-soft text-arma-red`}>{summary.overdue_orders} con entrega atrasada · {summary.overdue_pieces} piezas</button>:null}
      {summary.unscheduled_orders>0?<button type="button" aria-pressed={selected==='unscheduled'} onClick={()=>onSelect(selected==='unscheduled'?'':'unscheduled')} className={secondaryButton}>{summary.unscheduled_orders} sin fecha · {summary.unscheduled_pieces} piezas</button>:null}
    </div>
  </section>;
}

import { useId, useState } from 'react';
import { notify } from '@/lib/notify';
import { useCommerceMutations } from '../hooks/useCommerce';
import { commerceError } from '../services/commerce.service';
import { fieldClass, primaryButton, secondaryButton, todayInMonterrey } from '../utils/commerce-format';

export function DeliveryDateEditor({id, date}: {id: string; date: string | null}) {
  const inputId=useId();
  const [editing,setEditing]=useState(false);
  const [value,setValue]=useState(date??'');
  const {schedule}=useCommerceMutations();
  async function save() {
    if(value && value<todayInMonterrey()){notify.error('Elige hoy o una fecha posterior.');return;}
    const notification=notify.loading('Guardando fecha de entrega…');
    try {
      await schedule.mutateAsync({id,date:value||null});
      notify.success('Fecha de entrega actualizada',{id:notification});setEditing(false);
    } catch(error: unknown){notify.error(commerceError(error),{id:notification});}
  }
  if(!editing)return <button type="button" onClick={()=>{setValue(date??'');setEditing(true);}} className="mt-2 min-h-11 text-sm font-medium text-arma-active underline underline-offset-4">{date?'Cambiar fecha de entrega':'Programar entrega'}</button>;
  return <div className="mt-3 max-w-md">
    <label htmlFor={inputId} className="mb-2 block text-sm font-medium">Compromiso de entrega</label>
    <input id={inputId} type="date" value={value} min={todayInMonterrey()} disabled={schedule.isPending} onChange={event=>setValue(event.target.value)} className={fieldClass}/>
    <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={schedule.isPending} onClick={()=>void save()} className={primaryButton}>{schedule.isPending?'Guardando…':'Guardar fecha'}</button><button type="button" disabled={schedule.isPending} onClick={()=>setEditing(false)} className={secondaryButton}>Cancelar</button></div>
  </div>;
}

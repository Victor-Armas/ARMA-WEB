import { Bookmark, House, Shirt, ShoppingBag, Users } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import armaLogo from '@/assets/arma-logo.webp';

const upcomingSections = [
  { label: 'Clientes', icon: Users },
];

const itemClasses = 'flex min-h-13 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-arma border-0 bg-transparent px-1 py-2 text-[11px] no-underline outline-offset-4 focus-visible:outline-2 focus-visible:outline-arma-active disabled:cursor-default disabled:text-arma-muted desktop:flex-none desktop:flex-row desktop:flex-wrap desktop:justify-start desktop:gap-3 desktop:px-3 desktop:py-3 desktop:text-sm';

export function AppSidebar() {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-arma-border bg-arma-surface px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] desktop:sticky desktop:inset-auto desktop:top-0 desktop:col-start-1 desktop:row-span-2 desktop:row-start-1 desktop:h-dvh desktop:overflow-y-auto desktop:border-t-0 desktop:border-r desktop:px-4 desktop:pt-0 desktop:pb-6">
      <div className="hidden min-h-15 items-center px-3 desktop:flex justify-center">
        <Link
          to="/"
          aria-label="ARMA — Inicio"
          className="inline-flex rounded-arma outline-offset-4 focus-visible:outline-2 focus-visible:outline-arma-active"
        >
          <img src={armaLogo} alt="ARMA" className="h-auto w-30" />
        </Link>

      </div>

      <nav aria-label="Navegación principal" className="flex gap-1 desktop:flex-col desktop:gap-2 desktop:pt-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${itemClasses} ${isActive ? 'font-semibold text-arma-active desktop:bg-arma-primary-soft' : 'text-arma-icon'} desktop:hover:bg-arma-primary-soft`
          }
        >
          <House size={22} strokeWidth={1.7} aria-hidden="true" />
          <span>Inicio</span>
        </NavLink>
        <NavLink
          to="/products"
          className={({ isActive }) =>
            `${itemClasses} ${isActive
              ? 'font-semibold text-arma-active desktop:bg-arma-primary-soft'
              : 'text-arma-icon'
            } desktop:hover:bg-arma-primary-soft`
          }
        >
          <Shirt size={22} strokeWidth={1.7} aria-hidden="true" />
          <span>Productos</span>
        </NavLink>

        {[{to: '/reservations', label: 'Apartados', icon: Bookmark}, {to: '/sales', label: 'Ventas', icon: ShoppingBag}].map(({to,label,icon: Icon}) => <NavLink key={to} to={to} className={({isActive}) => `${itemClasses} ${isActive ? 'font-semibold text-arma-active desktop:bg-arma-primary-soft' : 'text-arma-icon'} desktop:hover:bg-arma-primary-soft`}><Icon size={22} strokeWidth={1.7} aria-hidden="true"/><span>{label}</span></NavLink>)}

        {upcomingSections.map(({ label, icon: Icon }) => (
          <button key={label} type="button" disabled title={`${label}: próximamente`} className={itemClasses}>
            <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
            <span>{label}</span>
            <span className="hidden w-full pl-8 text-[11px] desktop:block">Próximamente</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

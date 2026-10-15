import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { useId, useRef } from "react";
import {
  Bookmark,
  House,
  Shirt,
  ShoppingBag,
  Package,
  Users,
  Settings2,
  Ellipsis,
  Hammer,
  BookOpen,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router";
import armaLogo from "@/assets/arma-logo.webp";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
const items = [
  { to: "/", label: "Inicio", icon: House, permission: null },
  {
    to: "/products",
    label: "Productos",
    icon: Shirt,
    permission: "products.read",
  },
  {
    to: "/reservations",
    label: "Apartados",
    icon: Bookmark,
    permission: "reservations.read",
  },
  {
    to: "/sales",
    label: "Ventas",
    icon: ShoppingBag,
    permission: "sales.read",
  },
  {
    to: "/materials",
    label: "Materia prima",
    icon: Package,
    permission: "materials.read",
  },
  {
    to: "/product-management",
    label: "Gestión de productos",
    icon: Settings2,
    permission: "products.manage",
  },
  {
    to: "/production",
    label: "Armado de productos",
    icon: Hammer,
    permission: "production.read",
  },
  {
    to: "/recipes",
    label: "Recetas",
    icon: BookOpen,
    permission: "production.read",
  },
  {
    to: "/sellers",
    label: "Vendedores",
    icon: Users,
    permission: "consignments.read",
  },
  { to: "/team", label: "Equipo", icon: Users, permission: "team.read" },
];
const itemClasses =
  "min-h-13 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-arma bg-transparent px-1 py-2 text-center text-[11px] no-underline outline-offset-4 focus-visible:outline-2 focus-visible:outline-arma-active desktop:flex-none desktop:flex-row desktop:justify-start desktop:gap-3 desktop:px-3 desktop:py-3 desktop:text-left desktop:text-sm";
export function AppSidebar() {
  const access = useAppAccess();
  const id = useId();
  const popover = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const visible = items.filter(
    (item) => item.permission === null || access.can(item.permission),
  );
  const extra = visible.filter((item) =>
    [
      "/materials",
      "/production",
      "/recipes",
      "/product-management",
      "/team",
      "/sellers",
    ].includes(item.to),
  );
  const extraActive = extra.some(
    (item) =>
      location.pathname === item.to ||
      location.pathname.startsWith(item.to + "/"),
  );
  return (
    <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-arma-border bg-arma-surface px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] desktop:sticky desktop:inset-auto desktop:top-0 desktop:col-start-1 desktop:row-span-2 desktop:row-start-1 desktop:h-dvh desktop:overflow-y-auto desktop:border-t-0 desktop:border-r desktop:px-4 desktop:pt-0 desktop:pb-6">
      <div className="hidden min-h-15 items-center justify-center px-3 py-4 desktop:flex">
        <Link
          to="/"
          aria-label="ARMA — Inicio"
          className="inline-flex rounded-arma outline-offset-4 focus-visible:outline-2 focus-visible:outline-arma-active"
        >
          <img src={armaLogo} alt="ARMA" className="h-auto w-30" />
        </Link>
      </div>
      <nav
        aria-label="Navegación principal"
        className="flex gap-1 desktop:flex-col desktop:gap-2"
      >
        {visible.map(({ to, label, icon: Icon }) => {
          const secondary = extra.some((item) => item.to === to);
          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `${itemClasses} ${secondary ? "hidden desktop:flex" : "flex"} ${isActive ? "font-semibold text-arma-active desktop:bg-arma-primary-soft" : "text-arma-icon"} desktop:hover:bg-arma-primary-soft`
              }
            >
              <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          popoverTarget={id}
          className={`${itemClasses} flex desktop:hidden ${extraActive ? "font-semibold text-arma-active" : "text-arma-icon"}`}
        >
          <Ellipsis size={22} strokeWidth={1.7} aria-hidden="true" />
          <span>Más</span>
        </button>
      </nav>
      <div
        ref={popover}
        id={id}
        popover="auto"
        className="fixed inset-x-3 top-auto bottom-[calc(5.25rem+env(safe-area-inset-bottom))] m-0 w-auto rounded-arma border border-arma-border bg-arma-surface p-2 text-arma-text shadow-lg desktop:hidden"
      >
        <nav aria-label="Más secciones">
          {extra.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => popover.current?.hidePopover()}
              className={({ isActive }) =>
                `flex min-h-13 items-center gap-3 rounded-arma px-3 text-sm no-underline focus-visible:outline-2 focus-visible:outline-arma-active ${isActive ? "bg-arma-primary-soft font-semibold text-arma-active" : "text-arma-icon"}`
              }
            >
              <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div
          className={
            extra.length ? "mt-2 border-t border-arma-border pt-2" : ""
          }
        >
          <SignOutButton menu />
        </div>
      </div>
    </aside>
  );
}

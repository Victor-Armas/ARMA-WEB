import { useState, useRef } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { Link } from "react-router";
import { Search } from "lucide-react";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import { useSellerOptions } from "@/features/access/hooks/useTeam";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { useCommerceOrders } from "../hooks/useCommerce";
import {
  useReservationCalendar,
  useReservationToday,
} from "../hooks/useReservationCalendar";
import { ReservationCalendar } from "../components/ReservationCalendar";
import { ReservationOverview } from "../components/ReservationOverview";
import { ReservationListCard } from "../components/ReservationListCard";
import { ReservationRecord } from "../components/ReservationRecord";
import {
  calendarRange,
  moveCalendar,
  fullCalendarDate,
} from "../utils/reservation-calendar";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
} from "../utils/commerce-format";
import {
  reservationStatusSchema,
  type CalendarView,
  type ReservationStatus,
} from "../schemas/reservation-calendar.schema";
export function ReservationsPage() {
  const today = useReservationToday();
  const saving = useIsMutating({ mutationKey: ["commerce-write"] }) > 0;
  const listScroll = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState(() => today);
  const [view, setView] = useState<CalendarView>(() =>
    window.matchMedia("(max-width: 639px)").matches ? "week" : "month",
  );
  const [selected, setSelected] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReservationStatus>("pending");
  const [seller, setSeller] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const access = useAppAccess();
  const userId = useAuthStore((state) => state.session?.user.id);
  const debounced = useDebouncedValue(search.trim());
  const selectedSeller = access.can("commerce.read_all") ? seller : "";
  const sellers = useSellerOptions(access.can("commerce.read_all"));
  const range = calendarRange(anchor, view);
  const calendar = useReservationCalendar(
    { ...range, search: debounced, status, seller: selectedSeller },
    access.can("reservations.read"),
  );
  const orders = useCommerceOrders(
    "reservation",
    page,
    debounced,
    status,
    access.can("reservations.read"),
    selected,
    "all",
    selectedSeller,
  );
  const detail = orders.data?.items.find((order) => order.id === detailId);
  const busy =
    orders.isFetching ||
    orders.isPlaceholderData ||
    search.trim() !== debounced;
  const calendarBusy = calendar.isFetching || search.trim() !== debounced;
  function select(date: string) {
    setSelected(date);
    setPage(1);
  }
  function resetSelection() {
    setSelected("");
    setPage(1);
  }
  const listTitle =
    selected === "unscheduled"
      ? "Sin fecha asignada"
      : selected === "overdue"
        ? "Entregas atrasadas"
        : selected
          ? fullCalendarDate(selected)
          : "Todos los apartados";
  const photosFailed = orders.data?.items.some((order) =>
    order.items.some((item) => item.cover_path && !item.cover_url),
  );
  return (
    <section className="px-4 py-6 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-arma-heading text-4xl tracking-[-0.035em]">
            Apartados
          </h1>
          <p className="mt-2 text-sm leading-6 text-arma-muted">
            Organiza las entregas y consulta tus clientes, productos y pagos en
            un solo lugar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-xs text-arma-muted">
            Hoy: {fullCalendarDate(today)}
          </p>
          {access.can("reservations.create") && access.can("products.read") ? (
            <Link
              to="/products?action=reservation"
              className={`${primaryButton} inline-flex items-center justify-center no-underline`}
            >
              Crear apartado
            </Link>
          ) : null}
        </div>
      </header>
      <ReservationOverview
        summary={calendar.isError ? undefined : calendar.data?.summary}
        loading={calendarBusy}
      />
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="w-full min-w-0 sm:min-w-64 sm:flex-1">
          <label
            htmlFor="reservation-search"
            className="mb-2 block text-sm font-medium"
          >
            Buscar por cliente, teléfono, producto o folio
          </label>
          <div className="flex items-center gap-3 rounded-arma border border-arma-border bg-arma-surface px-3 focus-within:ring-2 focus-within:ring-arma-active">
            <Search
              size={18}
              aria-hidden="true"
              className="shrink-0 text-arma-icon"
            />
            <input
              id="reservation-search"
              type="search"
              maxLength={120}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetSelection();
              }}
              className="min-h-11 min-w-0 flex-1 bg-transparent text-base outline-none"
            />
          </div>
        </div>
        <div className="flex-1 sm:flex-none">
          <label
            htmlFor="reservation-state"
            className="mb-2 block text-sm font-medium"
          >
            Estado
          </label>
          <select
            id="reservation-state"
            value={status}
            onChange={(event) => {
              const value = reservationStatusSchema.safeParse(
                event.target.value,
              );
              if (value.success) {
                setStatus(value.data);
                resetSelection();
              }
            }}
            className={fieldClass}
          >
            <option value="pending">Por entregar</option>
            <option value="">Todos</option>
            <option value="active">Pendientes de pago</option>
            <option value="fulfilled">Pagados</option>
            <option value="delivered">Entregados</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>
        {access.can("commerce.read_all") ? (
          <div className="min-w-0 flex-1 sm:max-w-60">
            <label
              htmlFor="reservation-seller"
              className="mb-2 block text-sm font-medium"
            >
              Registrado por
            </label>
            <select
              id="reservation-seller"
              value={selectedSeller}
              disabled={sellers.isPending}
              onChange={(event) => {
                setSeller(event.target.value);
                resetSelection();
              }}
              className={fieldClass}
            >
              <option value="">Todo el equipo</option>
              {sellers.data?.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                  {person.is_active ? "" : " (inactivo)"}
                </option>
              ))}
            </select>
            {sellers.isError ? (
              <button
                type="button"
                onClick={() => void sellers.refetch()}
                className="mt-2 min-h-11 text-xs text-arma-red underline"
              >
                Reintentar lista del equipo
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-6 grid items-start gap-5 min-[1100px]:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)]">
        <div className="min-w-0">
          <ReservationCalendar
            anchor={anchor}
            view={view}
            today={today}
            selected={selected}
            days={calendar.data?.days ?? []}
            loading={calendarBusy}
            error={calendar.isError}
            onSelect={select}
            onNavigate={(direction) => {
              setAnchor((current) => moveCalendar(current, view, direction));
              resetSelection();
            }}
            onToday={() => {
              setAnchor(today);
              select(today);
            }}
            onView={setView}
            onRetry={() => void calendar.refetch()}
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              aria-pressed={selected === "unscheduled"}
              onClick={() =>
                select(selected === "unscheduled" ? "" : "unscheduled")
              }
              className={`${secondaryButton} flex-1 text-left ${selected === "unscheduled" ? "border-arma-active bg-arma-primary-soft" : ""}`}
            >
              <span className="block font-semibold">Sin fecha asignada</span>
              <span className="mt-1 block text-xs text-arma-muted">
                {calendar.data?.summary.unscheduled_orders ?? "—"} apartados ·{" "}
                {calendar.data?.summary.unscheduled_pieces ?? "—"} piezas
              </span>
            </button>
            <button
              type="button"
              aria-pressed={selected === "overdue"}
              onClick={() => select(selected === "overdue" ? "" : "overdue")}
              className={`${secondaryButton} text-arma-red ${selected === "overdue" ? "bg-arma-red-soft" : ""}`}
            >
              Ver atrasados
            </button>
          </div>
        </div>
        <section
          aria-labelledby="reservation-list-title"
          aria-busy={busy}
          className="min-w-0 rounded-arma border border-arma-border bg-arma-surface px-4 py-5 sm:px-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2
              id="reservation-list-title"
              className="min-w-0 font-arma-heading text-2xl first-letter:uppercase"
            >
              {listTitle}
            </h2>
            {selected ? (
              <button
                type="button"
                onClick={resetSelection}
                className="min-h-11 text-sm text-arma-active underline underline-offset-4"
              >
                Ver todos
              </button>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-arma-muted">
            <p>
              {orders.isError ? "—" : (orders.data?.total ?? "—")} apartados
            </p>
            <p role="status" className="min-h-4">
              {busy ? "Actualizando…" : ""}
            </p>
          </div>
          {photosFailed ? (
            <div role="alert" className="mt-3 text-xs text-arma-red">
              No pudimos cargar algunas fotografías.{" "}
              <button
                type="button"
                onClick={() => void orders.refetch()}
                className="min-h-11 underline"
              >
                Reintentar fotografías
              </button>
            </div>
          ) : null}
          {orders.isError ? (
            <div role="alert" className="py-8">
              <p className="text-sm text-arma-red">
                No pudimos cargar los apartados.
              </p>
              <button
                type="button"
                onClick={() => void orders.refetch()}
                className={`${secondaryButton} mt-4`}
              >
                Reintentar apartados
              </button>
            </div>
          ) : orders.isPending ? (
            <div role="status" className="py-8 text-sm text-arma-muted">
              Cargando apartados y fotografías…
            </div>
          ) : !orders.data?.items.length ? (
            <div className="border-t border-arma-border py-8">
              <h3 className="text-base font-semibold">
                {selected
                  ? "No hay apartados para esta selección"
                  : "No encontramos apartados con estos filtros"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-arma-muted">
                {selected
                  ? "Prueba otra fecha o consulta todos los apartados."
                  : "Puedes cambiar el estado o buscar por el teléfono del cliente."}
              </p>
              {selected ? (
                <button
                  type="button"
                  onClick={resetSelection}
                  className={`${secondaryButton} mt-4`}
                >
                  Consultar todos los apartados
                </button>
              ) : null}
            </div>
          ) : (
            <div
              ref={listScroll}
              className="mt-1 min-[1100px]:max-h-170 min-[1100px]:overflow-y-auto min-[1100px]:overscroll-y-contain min-[1100px]:pr-2"
            >
              {orders.data.items.map((order) => (
                <ReservationListCard
                  key={order.id}
                  order={order}
                  today={today}
                  onDetail={() => setDetailId(order.id)}
                />
              ))}
            </div>
          )}
          {!orders.isPending && !orders.isError ? (
            <Pagination
              page={orders.data?.page ?? page}
              totalPages={Math.max(
                1,
                Math.ceil((orders.data?.total ?? 0) / 12),
              )}
              disabled={busy}
              ariaLabel="Páginas de apartados"
              onPageChange={(next) => {
                setPage(next);
                listScroll.current?.scrollTo({ top: 0, behavior: "instant" });
              }}
            />
          ) : null}
        </section>
      </div>
      {detail ? (
        <Modal
          title={`Detalle del apartado #${String(detail.order_number).padStart(4, "0")}`}
          onClose={() => setDetailId(null)}
          busy={saving}
          wide
        >
          <ReservationRecord
            order={detail}
            canWrite={
              access.can("commerce.manage_all") || detail.created_by === userId
            }
            embedded
          />
        </Modal>
      ) : null}
    </section>
  );
}

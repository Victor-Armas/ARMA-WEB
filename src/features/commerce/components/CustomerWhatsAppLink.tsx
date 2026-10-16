import { MessageCircle } from "lucide-react";
import { getWhatsAppUrl } from "../utils/whatsapp";

export function CustomerWhatsAppLink({ phone }: { phone: string }) {
  const href = getWhatsAppUrl(phone);

  if (!href) {
    return <span className="inline-block break-all text-sm">{phone}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Abrir WhatsApp del cliente: ${phone}`}
      className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-arma text-sm text-arma-active underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active"
    >
      <MessageCircle size={16} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-all">{phone}</span>
      <span className="shrink-0 text-xs">WhatsApp</span>
    </a>
  );
}

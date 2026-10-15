import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { MaterialEntriesContent } from "./MaterialEntriesContent";
export function MaterialEntriesModal({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Entradas de materia prima" wide busy={busy} onClose={onClose}>
      <MaterialEntriesContent onBusyChange={setBusy} />
    </Modal>
  );
}

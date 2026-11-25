/**
 * Dialog
 * Modal built on the native <dialog> element: focus trap, Escape to close,
 * and a bottom sheet layout on small screens.
 */

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const Dialog = ({ open, onClose, title, children, footer }: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself
        if (event.target === ref.current) onClose();
      }}
    >
      <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
        <h2 className="marker text-xl">{title}</h2>
        <button type="button" className="btn btn-quiet btn-icon btn-sm" onClick={onClose} aria-label="Close">
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer && (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-paper-2 px-5 py-3">
          {footer}
        </footer>
      )}
    </dialog>
  );
};

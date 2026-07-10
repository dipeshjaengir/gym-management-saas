import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;     // e.g., 'max-w-lg', 'max-w-md', 'max-w-4xl', 'max-w-2xl'
  zIndexClass?: string;       // e.g., 'z-50', 'z-[60]', 'z-[100]'
  closeOnOutsideClick?: boolean;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidthClass = 'max-w-lg',
  zIndexClass = 'z-50',
  closeOnOutsideClick = true
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Background scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus trap inside the modal
  useEffect(() => {
    if (!isOpen) return;

    const modalElement = cardRef.current;
    if (!modalElement) return;

    // Find all focusable elements
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(
      modalElement.querySelectorAll(focusableSelector)
    ) as HTMLElement[];

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus the first element on mount
    firstElement.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab: if focus is on the first element, wrap around to the last
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab: if focus is on the last element, wrap around to the first
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    modalElement.addEventListener('keydown', handleTabKey);
    return () => {
      modalElement.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOutsideClick = (e: React.MouseEvent) => {
    if (closeOnOutsideClick && e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOutsideClick}
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 bg-black/65 backdrop-blur-[2px] transition-all duration-300 animate-fade-in pt-[max(1rem,env(safe-area-inset-top,1rem))] pb-[max(1rem,env(safe-area-inset-bottom,1rem))] pl-[max(1rem,env(safe-area-inset-left,1rem))] pr-[max(1rem,env(safe-area-inset-right,1rem))]`}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        className={`w-full ${maxWidthClass} bg-card border border-border rounded-3xl shadow-2xl relative flex flex-col max-h-[90dvh] max-h-[90vh] transition-all duration-300 transform scale-100 animate-scale-up`}
      >
        {/* Sticky Header */}
        <div className="p-5 pb-3.5 border-b border-border/80 flex items-start justify-between bg-card rounded-t-3xl sticky top-0 z-10 shrink-0">
          <div className="pr-10">
            <h2 className="text-base sm:text-lg font-extrabold text-foreground leading-snug tracking-tight">{title}</h2>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5 font-medium leading-normal">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center justify-center min-w-[36px] min-h-[36px]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm">
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="p-5 pt-3.5 border-t border-border/80 bg-card rounded-b-3xl sticky bottom-0 z-10 shrink-0 flex gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

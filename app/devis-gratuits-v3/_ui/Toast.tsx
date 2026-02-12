"use client";

import { useEffect, useState } from "react";
import { Check, X, AlertCircle, Info } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose?: () => void;
}

export function Toast({
  message,
  type = "info",
  duration = 5000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  if (!isVisible) return null;
  
  const icons = {
    success: Check,
    error: X,
    warning: AlertCircle,
    info: Info,
  };
  
  const colors = {
    success: "bg-[#10B981] text-white",
    error: "bg-[#EF4444] text-white",
    warning: "bg-[#F59E0B] text-white",
    info: "bg-[#6BCFCF] text-white",
  };
  
  const Icon = icons[type];
  
  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl backdrop-blur-xl border border-white/20 animate-in slide-in-from-top-2 duration-300 ${colors[type]}`}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
      <p className="text-sm font-medium">{message}</p>
      <button
        type="button"
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="ml-2 hover:opacity-80 transition-opacity"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
}

// Hook pour faciliter l'utilisation
export function useToast() {
  const [toast, setToast] = useState<ToastProps | null>(null);
  
  const showToast = (props: Omit<ToastProps, "onClose">) => {
    setToast({
      ...props,
      onClose: () => setToast(null),
    });
  };
  
  return {
    toast,
    showToast,
    hideToast: () => setToast(null),
  };
}

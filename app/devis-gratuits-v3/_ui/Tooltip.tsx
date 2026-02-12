"use client";

import { ReactNode, useState } from "react";
import { HelpCircle } from "lucide-react";

interface TooltipProps {
  content: string;
  children?: ReactNode;
  iconOnly?: boolean;
}

export function Tooltip({ content, children, iconOnly = false }: TooltipProps) {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className="inline-flex items-center justify-center focus:outline-none"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        aria-label={content}
      >
        {iconOnly ? (
          <div className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-[#6BCFCF] to-[#A78BFA] hover:from-[#A78BFA] hover:to-[#6BCFCF] transition-all cursor-help">
            <HelpCircle className="w-3 h-3 text-white" strokeWidth={2} />
          </div>
        ) : (
          children
        )}
      </button>
      
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className="px-3 py-2 text-xs font-medium text-white bg-[#0F172A] rounded-lg shadow-xl max-w-xs whitespace-normal">
            {content}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-[#0F172A]" />
          </div>
        </div>
      )}
    </div>
  );
}

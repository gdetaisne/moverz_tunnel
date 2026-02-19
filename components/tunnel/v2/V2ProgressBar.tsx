"use client";

interface V2ProgressBarProps {
  step: 1 | 2 | 3 | 4;
  onReset?: () => void;
}

const timeText: Record<1 | 2 | 3 | 4, string> = {
  1: "~2 min",
  2: "~2 min",
  3: "",
  4: "Dernière étape",
};

export function V2ProgressBar({ step, onReset }: V2ProgressBarProps) {
  const progress = (step / 4) * 100;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-sm text-[#0F172A] mb-2">
        <span
          className="text-[#1E293B]/60 cursor-default select-none"
          onClick={step === 1 && onReset ? () => onReset() : undefined}
        >Progression</span>
        <span className="font-semibold">{timeText[step]}</span>
      </div>
      <div className="w-full h-2 bg-[#E3E5E8] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#6BCFCF] to-[#2B7A78] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

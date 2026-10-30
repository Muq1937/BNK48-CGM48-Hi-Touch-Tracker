"use client";

import { Minus, Plus } from "lucide-react";
import { t } from "@/lib/strings";

export const MAX_TICKETS = 999;

/** − value + control for a round's ticket count. */
export function Stepper({
  label,
  value,
  onStep,
  disabled,
}: {
  label: string;
  value: number;
  onStep: (delta: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onStep(-1)}
        disabled={disabled || value === 0}
        aria-label={t.log.decrease(label)}
        className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-line-strong bg-surface disabled:opacity-35"
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <output
        aria-label={t.log.ticketsFor(label)}
        className="w-8 text-center text-lg font-extrabold tabular-nums"
      >
        {value}
      </output>
      <button
        type="button"
        onClick={() => onStep(1)}
        disabled={disabled || value >= MAX_TICKETS}
        aria-label={t.log.increase(label)}
        className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-ink text-white disabled:opacity-35"
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

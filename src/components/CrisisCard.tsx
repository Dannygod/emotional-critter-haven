import { ShieldAlert, X, Phone } from "lucide-react";
import { CRISIS_HOTLINES } from "@/lib/emotion/safety";

interface CrisisCardProps {
  onDismiss?: () => void;
}

/**
 * Fixed crisis-help card shown when AI detects self_harm / harm_others / crisis.
 * Replaces the easily-missed toast notification.
 */
export function CrisisCard({ onDismiss }: CrisisCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-red-300/60 bg-gradient-to-br from-red-50 to-orange-50 p-5 shadow-pillow dark:from-red-950/30 dark:to-orange-950/20">
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="關閉求助卡片"
          className="absolute right-3 top-3 rounded-full p-1.5 text-red-400 transition hover:bg-red-100 hover:text-red-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
          <ShieldAlert className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-red-700">
            你不是一個人
          </h3>
          <p className="text-xs text-red-500/80">
            如果你正在經歷很大的痛苦，請讓這些人陪你。
          </p>
        </div>
      </div>

      {/* Hotlines */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {CRISIS_HOTLINES.map((h) => (
          <a
            key={h.number}
            href={`tel:${h.number}`}
            className="flex items-center gap-2 rounded-2xl border border-red-200/60 bg-white/70 px-3.5 py-2.5 text-sm transition hover:bg-white hover:shadow-sm"
          >
            <Phone className="h-4 w-4 shrink-0 text-red-400" />
            <div className="min-w-0">
              <p className="font-medium text-red-700">{h.number}</p>
              <p className="truncate text-xs text-red-400">{h.label}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Encouragement */}
      <p className="mt-3 text-center text-xs leading-5 text-red-400/90">
        撥出電話不代表軟弱，而是你願意為自己多走一步。💛
      </p>
    </div>
  );
}

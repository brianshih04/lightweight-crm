import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin",
        className
      )}
    />
  );
}

export function PageLoader({ label = "載入中..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center min-h-[400px]"
    >
      <div className="flex items-center gap-3 text-slate-500 text-sm">
        <Spinner className="w-5 h-5 text-indigo-600" />
        {label}
      </div>
    </div>
  );
}

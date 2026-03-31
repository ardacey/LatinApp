import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-5 h-5 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin",
        className
      )}
    />
  );
}

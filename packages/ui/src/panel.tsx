import { cn } from "./utils.js";

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col border border-white/10 bg-[hsl(222,20%,10%)]", className)}>
      {title && (
        <div className="border-b border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/60">
          {title}
        </div>
      )}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}

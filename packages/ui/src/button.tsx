import { cn } from "./utils.js";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "md";
}

export function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm",
        variant === "default" && "bg-violet-600 text-white hover:bg-violet-500",
        variant === "ghost" && "hover:bg-white/10",
        variant === "outline" && "border border-white/20 hover:bg-white/5",
        className
      )}
      {...props}
    />
  );
}

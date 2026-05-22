import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function EditorPanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col gap-0 rounded-none border-border/60 py-0", className)}>
      {title && (
        <CardHeader className="border-b border-border/60 px-3 py-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 overflow-auto p-0">{children}</CardContent>
    </Card>
  );
}

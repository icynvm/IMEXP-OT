import { Inbox, type LucideIcon } from "lucide-react";

export function EmptyState({
  children,
  icon: Icon = Inbox,
  action,
}: {
  children: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
        <Icon className="size-5" />
      </div>
      <p className="text-muted-foreground text-sm">{children}</p>
      {action}
    </div>
  );
}

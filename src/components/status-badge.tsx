import { Ban, CircleCheck, CircleX, Clock, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/constants";
import type { ApprovalStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<ApprovalStatus, { className: string; icon: LucideIcon }> = {
  pending: { className: "border-amber-200 bg-amber-50 text-amber-700", icon: Clock },
  approved: { className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: CircleCheck },
  rejected: { className: "border-red-200 bg-red-50 text-red-700", icon: CircleX },
  cancelled: { className: "border-border bg-muted text-muted-foreground", icon: Ban },
};

export function StatusBadge({ status }: { status: ApprovalStatus }) {
  const { className, icon: Icon } = STYLES[status];
  return (
    <Badge variant="outline" className={cn(className)}>
      <Icon />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

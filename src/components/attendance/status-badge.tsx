import { cn } from "@/lib/utils";
import { getAttendanceStatusLabel, getAttendanceStatusColor } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        getAttendanceStatusColor(status),
        className
      )}
    >
      {getAttendanceStatusLabel(status)}
    </span>
  );
}

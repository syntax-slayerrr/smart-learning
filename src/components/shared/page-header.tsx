interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between pb-2">
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F] sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-[#6E6E73]">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-1 sm:pt-0">
          {action}
        </div>
      )}
    </div>
  );
}

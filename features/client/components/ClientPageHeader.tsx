import { cn } from "@/lib/utils";
import type { ClientTabKey } from "@/features/client/types";
import { CLIENT_TABS } from "@/features/client/types";

export function ClientPageHeader({
  clientName,
  balance,
  isOwner,
  myRole,
  tab,
  onTabChange,
}: {
  clientName: string;
  balance: number;
  isOwner: boolean;
  myRole: string | null;
  tab: ClientTabKey;
  onTabChange: (tab: ClientTabKey) => void;
}) {
  return (
    <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
      <div className="w-full px-3 sm:px-4 md:px-6 2xl:px-10">
        <div className="flex min-h-14 items-center justify-between gap-3 pl-10 md:min-h-16 md:pl-0">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:hidden">Behavior Zone</p>
            <h1 className="truncate text-base font-bold md:text-xl">{clientName}</h1>
          </div>
          <div className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            {balance} pts
          </div>
          <p className="hidden text-xs text-muted-foreground lg:block">
            {isOwner ? "Owner" : myRole?.toUpperCase()}
          </p>
        </div>
        <div className="hidden lg:flex gap-0.5 -mb-px overflow-x-auto scrollbar-none">
          {CLIENT_TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={cn(
                "px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0",
                tab === item.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              )}
            >
              <span className="md:mr-1">{item.icon}</span>
              <span className="hidden sm:inline"> {item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

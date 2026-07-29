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
    <div className="border-b bg-card sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="py-3 md:py-4 pl-10 md:pl-0">
          <h1 className="text-lg md:text-xl font-bold">{clientName}</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {balance} points
            {isOwner && " · Owner"}
            {myRole && !isOwner && ` · ${myRole.toUpperCase()}`}
          </p>
        </div>
        <div className="flex gap-0.5 -mb-px overflow-x-auto scrollbar-none">
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

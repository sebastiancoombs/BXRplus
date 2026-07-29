"use client";

import BehaviorZone from "@/components/behavior-zone/BehaviorZonePage";
import BxrProviders from "@/components/behavior-zone/BxrProviders";
import ClientSelectorSidebar from "@/components/behavior-zone/ClientSelectorSidebar";

export default function BehaviorZonePage() {
  return (
    <BxrProviders>
      <div className="flex h-full overflow-hidden bg-background">
        <ClientSelectorSidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <BehaviorZone />
        </main>
      </div>
    </BxrProviders>
  );
}

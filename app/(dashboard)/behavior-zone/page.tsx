"use client";

import BehaviorZone from "@/components/behavior-zone/BehaviorZonePage";
import BxrProviders from "@/components/behavior-zone/BxrProviders";

export default function BehaviorZonePage() {
  return (
    <BxrProviders>
      <div className="h-full overflow-y-auto bg-background">
        <BehaviorZone />
      </div>
    </BxrProviders>
  );
}

"use client";

import BxrPlusNotesCanvas from "@/bxrplus-notes/BxrPlusNotesCanvas";
import BxrProviders from "@/components/behavior-zone/BxrProviders";

export default function NotesPage() {
  return (
    <BxrProviders>
      <div className="h-full overflow-y-auto bg-background">
        <BxrPlusNotesCanvas />
      </div>
    </BxrProviders>
  );
}

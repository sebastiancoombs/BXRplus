"use client";

export default function NotesPage() {
  return (
    <iframe
      src="/behavior-zone-app/index.html?embed=notes"
      title="BXR+ Notes"
      className="h-full w-full border-0 bg-white"
      allow="clipboard-read; clipboard-write"
    />
  );
}

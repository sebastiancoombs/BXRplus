"use client";

export default function NotesPage() {
  return (
    <iframe
      src="/behavior-zone-app/notes?embed=true"
      title="BXR+ Notes"
      className="h-full w-full border-0 bg-white"
      allow="clipboard-read; clipboard-write"
    />
  );
}

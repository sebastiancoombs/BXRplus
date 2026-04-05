import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface IconPickerProps {
  value: string; // emoji character or URL
  onChange: (value: string) => void;
  clientId?: string; // for upload path
}

export default function IconPicker({ value, onChange, clientId }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"emoji" | "upload">("emoji");
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop() ?? "png";
    const path = `icons/${clientId ?? "shared"}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("uploads").upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
    });

    if (error) {
      // If bucket doesn't exist yet, try creating it
      console.error("Upload error:", error);
      alert("Upload failed. Make sure the 'uploads' storage bucket exists in Supabase.");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
    onChange(urlData.publicUrl);
    setOpen(false);
    setUploading(false);
  }

  const isUrl = value.startsWith("http");

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-12 h-9 rounded-md border border-input bg-background flex items-center justify-center hover:bg-accent transition-colors"
        title="Choose icon"
      >
        {isUrl ? (
          <img src={value} alt="" className="w-6 h-6 object-contain rounded" />
        ) : (
          <span className="text-xl">{value || "➕"}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border rounded-xl shadow-xl w-[320px] max-w-[90vw]">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              type="button"
              onClick={() => setTab("emoji")}
              className={cn(
                "flex-1 px-3 py-2 text-xs font-medium transition-colors",
                tab === "emoji" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
              )}
            >
              😀 Emoji Search
            </button>
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={cn(
                "flex-1 px-3 py-2 text-xs font-medium transition-colors",
                tab === "upload" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
              )}
            >
              📷 Upload Image
            </button>
          </div>

          {/* Emoji tab */}
          {tab === "emoji" && (
            <EmojiTab onSelect={(emoji) => { onChange(emoji); setOpen(false); }} />
          )}

          {/* Upload tab */}
          {tab === "upload" && (
            <div className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Upload any image — a character, logo, photo, or drawing.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "📷 Choose Image"}
              </Button>
              {isUrl && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <img src={value} alt="" className="w-10 h-10 object-contain rounded" />
                  <span className="text-xs text-muted-foreground flex-1 truncate">Current image</span>
                  <Button type="button" variant="ghost" size="sm" className="text-xs"
                    onClick={() => { onChange("⭐"); }}>
                    Remove
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Emoji picker with search ──

function EmojiTab({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [EmojiPicker, setEmojiPicker] = useState<any>(null);
  const [emojiData, setEmojiData] = useState<any>(null);

  // Lazy load emoji-mart
  useEffect(() => {
    Promise.all([
      import("@emoji-mart/react"),
      import("@emoji-mart/data"),
    ]).then(([pickerMod, dataMod]) => {
      setEmojiPicker(() => pickerMod.default);
      setEmojiData(dataMod.default);
    });
  }, []);

  if (!EmojiPicker || !emojiData) {
    return <div className="p-4 text-sm text-muted-foreground text-center">Loading emojis...</div>;
  }

  return (
    <div className="emoji-picker-container">
      <EmojiPicker
        data={emojiData}
        onEmojiSelect={(emoji: any) => onSelect(emoji.native)}
        theme="light"
        previewPosition="none"
        skinTonePosition="none"
        maxFrequentRows={1}
        perLine={8}
        emojiSize={24}
        emojiButtonSize={32}
        searchPosition="top"
        navPosition="bottom"
        set="native"
      />
    </div>
  );
}

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Client } from "@/types/database";

// ═══════════════════════════════════════
// Card theme options
// ═══════════════════════════════════════

interface CardTheme {
  id: string;
  label: string;
  emoji: string;
  bg: string;
  chipColor: string;
  textClass: string;
  textHex: string;
}

const cardThemes: CardTheme[] = [
  { id: "galaxy", label: "Galaxy", emoji: "🚀", bg: "linear-gradient(135deg, #1e1b4b, #4f46e5, #7c3aed)", chipColor: "#a78bfa", textClass: "text-white", textHex: "#ffffff" },
  { id: "ocean", label: "Ocean", emoji: "🐬", bg: "linear-gradient(135deg, #0c4a6e, #0284c7, #38bdf8)", chipColor: "#7dd3fc", textClass: "text-white", textHex: "#ffffff" },
  { id: "sunset", label: "Sunset", emoji: "🌅", bg: "linear-gradient(135deg, #9a3412, #ea580c, #fbbf24)", chipColor: "#fde68a", textClass: "text-white", textHex: "#ffffff" },
  { id: "forest", label: "Forest", emoji: "🌲", bg: "linear-gradient(135deg, #14532d, #16a34a, #86efac)", chipColor: "#bbf7d0", textClass: "text-white", textHex: "#ffffff" },
  { id: "candy", label: "Candy", emoji: "🍬", bg: "linear-gradient(135deg, #ec4899, #f472b6, #fda4af)", chipColor: "#fecdd3", textClass: "text-white", textHex: "#ffffff" },
  { id: "dino", label: "Dinosaur", emoji: "🦕", bg: "linear-gradient(135deg, #365314, #65a30d, #a3e635)", chipColor: "#d9f99d", textClass: "text-white", textHex: "#ffffff" },
  { id: "space", label: "Space", emoji: "👾", bg: "linear-gradient(135deg, #0f172a, #1e293b, #334155)", chipColor: "#94a3b8", textClass: "text-white", textHex: "#ffffff" },
  { id: "rainbow", label: "Rainbow", emoji: "🌈", bg: "linear-gradient(135deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6)", chipColor: "#fde68a", textClass: "text-white", textHex: "#ffffff" },
  { id: "unicorn", label: "Unicorn", emoji: "🦄", bg: "linear-gradient(135deg, #c084fc, #f0abfc, #fbcfe8)", chipColor: "#fae8ff", textClass: "text-purple-900", textHex: "#581c87" },
  { id: "sports", label: "Sports", emoji: "⚽", bg: "linear-gradient(135deg, #1e3a5f, #2563eb, #60a5fa)", chipColor: "#bfdbfe", textClass: "text-white", textHex: "#ffffff" },
  { id: "superhero", label: "Superhero", emoji: "💥", bg: "linear-gradient(135deg, #991b1b, #dc2626, #fbbf24)", chipColor: "#fde68a", textClass: "text-white", textHex: "#ffffff" },
  { id: "arctic", label: "Arctic", emoji: "🐧", bg: "linear-gradient(135deg, #e0f2fe, #bae6fd, #7dd3fc)", chipColor: "#0ea5e9", textClass: "text-sky-900", textHex: "#0c4a6e" },
];

const stickerOptions = ["⭐", "🌟", "🎯", "🔥", "💎", "🏅", "🎮", "🎨", "🎵", "🐾", "🦋", "🌸", "⚡", "🍕", "🎪"];

export function PrintableClientCard({ client }: { client: Client }) {
  const [themeId, setThemeId] = useState("galaxy");
  const [sticker, setSticker] = useState("⭐");
  const [showCustomize, setShowCustomize] = useState(false);
  const theme = cardThemes.find((t) => t.id === themeId) ?? cardThemes[0];

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>BXR+ Card — ${client.full_name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .card { width: 3.375in; height: 2.125in; border-radius: 14px; background: ${theme.bg}; color: ${theme.textHex}; padding: 18px; position: relative; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.15); }
        .card::before { content: ''; position: absolute; top: -40px; right: -40px; width: 140px; height: 140px; border-radius: 50%; background: rgba(255,255,255,0.08); }
        .card::after { content: ''; position: absolute; bottom: -50px; left: -30px; width: 120px; height: 120px; border-radius: 50%; background: rgba(255,255,255,0.05); }
        .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; position: relative; z-index: 1; }
        .brand { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.7; }
        .sticker { font-size: 28px; }
        .chip { width: 34px; height: 26px; border-radius: 5px; background: ${theme.chipColor}; margin-bottom: 14px; opacity: 0.8; position: relative; z-index: 1; }
        .name { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; position: relative; z-index: 1; }
        .subtitle { font-size: 11px; opacity: 0.7; margin-top: 2px; position: relative; z-index: 1; }
        .qr-wrap { position: absolute; bottom: 12px; right: 12px; background: white; padding: 5px; border-radius: 8px; z-index: 1; }
        .theme-emoji { position: absolute; bottom: 10px; left: 16px; font-size: 22px; opacity: 0.3; z-index: 0; }
        @media print { body { background: white; } .card { box-shadow: none; border: 1px solid #ddd; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="card">
        <div class="top">
          <div class="brand">🏆 BXR+</div>
          <div class="sticker">${sticker}</div>
        </div>
        <div class="chip"></div>
        <div class="name">${client.full_name}</div>
        <div class="subtitle">My Reward Card</div>
        <div class="theme-emoji">${theme.emoji}</div>
        <div class="qr-wrap">
          ${document.getElementById('print-qr-' + client.id)?.innerHTML ?? ''}
        </div>
      </div>
      <script>window.print(); window.close();<\/script>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <div className="space-y-4">
      {/* Live preview */}
      <div
        className="relative w-[3.375in] h-[2.125in] rounded-[14px] overflow-hidden p-[18px] cursor-pointer hover:shadow-xl transition-shadow"
        style={{ background: theme.bg }}
        onClick={handlePrint}
      >
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-7 w-28 h-28 rounded-full bg-white/5" />
        <div className="flex justify-between items-start relative z-10 mb-2.5">
          <p className={`text-[10px] tracking-[2px] uppercase opacity-70 ${theme.textClass}`}>🏆 BXR+</p>
          <span className="text-3xl">{sticker}</span>
        </div>
        <div className="w-[34px] h-[26px] rounded-[5px] mb-3.5 opacity-80 relative z-10" style={{ background: theme.chipColor }} />
        <p className={`text-xl font-extrabold tracking-wide relative z-10 ${theme.textClass}`}>{client.full_name}</p>
        <p className={`text-[11px] opacity-70 mt-0.5 relative z-10 ${theme.textClass}`}>My Reward Card</p>
        <span className="absolute bottom-2.5 left-4 text-2xl opacity-20">{theme.emoji}</span>
        <div className="absolute bottom-3 right-3 bg-white p-1.5 rounded-lg z-10" id={`print-qr-${client.id}`}>
          <QRCodeSVG value={client.qr_code} size={44} />
        </div>
      </div>

      {/* Customize toggle */}
      <button
        onClick={() => setShowCustomize(!showCustomize)}
        className="text-sm text-primary hover:underline"
      >
        {showCustomize ? "Hide options" : "🎨 Customize card"}
      </button>

      {showCustomize && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-xl">
          {/* Theme picker */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Card Theme</p>
            <div className="flex flex-wrap gap-2">
              {cardThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    themeId === t.id
                      ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sticker picker */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Card Sticker</p>
            <div className="flex flex-wrap gap-1.5">
              {stickerOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setSticker(s)}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-xl border transition-all",
                    sticker === s
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Print button */}
      <Button variant="outline" onClick={handlePrint} className="w-full">
        🖨️ Print Card
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════
// Reward Ticket (unchanged)
// ═══════════════════════════════════════

export function PrintableRewardTicket({ reward, client }: {
  reward: { id: string; name: string; icon: string; point_cost: number };
  client: Client;
}) {
  const qrValue = JSON.stringify({
    action: "redeem",
    clientId: client.id,
    rewardId: reward.id,
  });

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>BXR+ Reward — ${reward.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .ticket { width: 3in; background: white; border: 2px solid #e5e7eb; border-radius: 16px; padding: 24px; text-align: center; position: relative; }
        .ticket::before, .ticket::after { content: ''; position: absolute; width: 20px; height: 20px; background: #f5f5f5; border-radius: 50%; top: 50%; }
        .ticket::before { left: -12px; border-right: 2px solid #e5e7eb; }
        .ticket::after { right: -12px; border-left: 2px solid #e5e7eb; }
        .icon { font-size: 36px; margin-bottom: 8px; }
        .name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
        .cost { font-size: 13px; color: #6b7280; margin-bottom: 16px; }
        .qr { display: inline-block; padding: 8px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; }
        .scan-text { font-size: 10px; color: #9ca3af; }
        .brand { font-size: 9px; color: #9ca3af; margin-top: 12px; letter-spacing: 1px; }
        .for { font-size: 11px; color: #6b7280; margin-bottom: 12px; }
        @media print { body { background: white; } }
      </style></head><body>
      <div class="ticket">
        <div class="icon">${reward.icon}</div>
        <div class="name">${reward.name}</div>
        <div class="cost">${reward.point_cost} points</div>
        <div class="for">for ${client.full_name}</div>
        <div class="qr">
          ${document.getElementById('reward-qr-' + reward.id)?.innerHTML ?? ''}
        </div>
        <div class="scan-text">Scan to redeem</div>
        <div class="brand">🏆 BXR+</div>
      </div>
      <script>window.print(); window.close();<\/script>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <div className="text-center">
      <div className="hidden" id={`reward-qr-${reward.id}`}>
        <QRCodeSVG value={qrValue} size={80} />
      </div>
      <div
        className="inline-block bg-card border-2 rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow relative"
        onClick={handlePrint}
      >
        <div className="absolute w-5 h-5 bg-background rounded-full -left-3 top-1/2 -translate-y-1/2 border-r-2" />
        <div className="absolute w-5 h-5 bg-background rounded-full -right-3 top-1/2 -translate-y-1/2 border-l-2" />
        <span className="text-4xl block mb-2">{reward.icon}</span>
        <p className="font-bold">{reward.name}</p>
        <p className="text-sm text-muted-foreground">{reward.point_cost} pts</p>
        <div className="mt-3 inline-block border rounded-lg p-2">
          <QRCodeSVG value={qrValue} size={64} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Scan to redeem</p>
      </div>
      <div className="mt-2">
        <Button variant="ghost" size="sm" onClick={handlePrint} className="text-xs">
          🖨️ Print
        </Button>
      </div>
    </div>
  );
}

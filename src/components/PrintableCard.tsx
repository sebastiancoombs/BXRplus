import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import type { Client } from "@/types/database";

export function PrintableClientCard({ client }: { client: Client }) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const el = cardRef.current;
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>BXR+ Card — ${client.full_name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .card { width: 3.375in; height: 2.125in; border-radius: 12px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 20px; position: relative; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
        .card::before { content: ''; position: absolute; top: -30px; right: -30px; width: 120px; height: 120px; border-radius: 50%; background: rgba(255,255,255,0.08); }
        .card::after { content: ''; position: absolute; bottom: -40px; left: -20px; width: 100px; height: 100px; border-radius: 50%; background: rgba(255,255,255,0.05); }
        .brand { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px; }
        .name { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .balance { font-size: 11px; opacity: 0.8; }
        .qr-wrap { position: absolute; bottom: 14px; right: 14px; background: white; padding: 6px; border-radius: 8px; }
        .chip { width: 32px; height: 24px; border-radius: 4px; background: linear-gradient(135deg, #fbbf24, #f59e0b); margin-bottom: 12px; }
        @media print { body { background: white; } }
      </style></head><body>
      <div class="card">
        <div class="brand">🏆 BXR+</div>
        <div class="chip"></div>
        <div class="name">${client.full_name}</div>
        <div class="balance">Token Economy Card</div>
        <div class="qr-wrap">
          ${document.getElementById('print-qr-' + client.id)?.innerHTML ?? ''}
        </div>
      </div>
      <script>window.print(); window.close();</script>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <div>
      {/* Preview card */}
      <div ref={cardRef} className="relative w-[3.375in] h-[2.125in] rounded-xl overflow-hidden text-white p-5 cursor-pointer hover:shadow-xl transition-shadow"
        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        onClick={handlePrint}
      >
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-5 w-24 h-24 rounded-full bg-white/5" />
        <p className="text-[10px] tracking-[2px] uppercase opacity-70 mb-2">🏆 BXR+</p>
        <div className="w-8 h-6 rounded bg-gradient-to-br from-yellow-400 to-amber-500 mb-3" />
        <p className="text-lg font-bold">{client.full_name}</p>
        <p className="text-[11px] opacity-80">Token Economy Card</p>
        <div className="absolute bottom-3 right-3 bg-white p-1.5 rounded-lg" id={`print-qr-${client.id}`}>
          <QRCodeSVG value={client.qr_code} size={44} />
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={handlePrint} className="mt-3 w-full">
        🖨️ Print Card
      </Button>
    </div>
  );
}

export function PrintableRewardTicket({ reward, client }: {
  reward: { id: string; name: string; icon: string; point_cost: number };
  client: Client;
}) {
  // QR encodes a JSON payload the scan page can parse
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
      <script>window.print(); window.close();</script>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <div className="text-center">
      {/* Hidden QR for print extraction */}
      <div className="hidden" id={`reward-qr-${reward.id}`}>
        <QRCodeSVG value={qrValue} size={80} />
      </div>

      {/* Visible ticket preview */}
      <div
        className="inline-block bg-card border-2 rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow relative"
        onClick={handlePrint}
      >
        {/* Notch cuts */}
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

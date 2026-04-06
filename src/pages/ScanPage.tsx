import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { redeemReward } from "@/hooks/useClients";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientContext } from "@/contexts/ClientContext";

export default function ScanPage() {
  const navigate = useNavigate();
  const { setActiveClientId, refresh } = useClientContext();
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [manualCode, setManualCode] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pending redemption state
  const [pendingRedeem, setPendingRedeem] = useState<{ clientId: string; rewardId: string; rewardName?: string } | null>(null);

  async function handleScan(text: string) {
    // Try to parse as reward redemption QR
    try {
      const data = JSON.parse(text);
      if (data.action === "redeem" && data.clientId && data.rewardId) {
        // Look up the reward name for the confirm message
        const { data: reward } = await (await import("@/lib/supabase")).supabase
          .from("rewards")
          .select("name, point_cost")
          .eq("id", data.rewardId)
          .single();

        setPendingRedeem({
          clientId: data.clientId,
          rewardId: data.rewardId,
          rewardName: reward ? `${reward.name} (${reward.point_cost} pts)` : "this reward",
        });
        setStatus("idle");
        setStatusMsg("");
        return;
      }
    } catch {
      // Not JSON — treat as client QR code
    }

    // Client QR code — open public live session by QR
    setStatus("success");
    setStatusMsg("Opening live session...");
    setTimeout(() => navigate(`/session?qr=${encodeURIComponent(text)}`), 300);
  }

  async function confirmRedeem() {
    if (!pendingRedeem) return;
    setStatusMsg("Redeeming...");
    try {
      await redeemReward(pendingRedeem.clientId, pendingRedeem.rewardId);
      await refresh();
      setStatus("success");
      setStatusMsg("Reward redeemed! 🎉");
      setActiveClientId(pendingRedeem.clientId);
      setPendingRedeem(null);
    } catch (err: any) {
      setStatus("error");
      setStatusMsg(err?.message ?? "Failed to redeem. Not enough points?");
      setPendingRedeem(null);
    }
  }

  function cancelRedeem() {
    setPendingRedeem(null);
    setStatus("idle");
    setStatusMsg("");
  }

  async function startScanning() {
    setScanning(true);
    setStatus("idle");
    setStatusMsg("");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      if (devices.length === 0) {
        setStatus("error");
        setStatusMsg("No camera found.");
        setScanning(false);
        return;
      }
      const backCam = devices.find((d: MediaDeviceInfo) => d.label.toLowerCase().includes("back")) ?? devices[0];
      reader.decodeFromVideoDevice(backCam.deviceId, videoRef.current!, (result: any) => {
        if (result) {
          setScanning(false);
          handleScan(result.getText());
        }
      });
    } catch (err) {
      console.error("Camera error:", err);
      setStatus("error");
      setStatusMsg("Could not access camera.");
      setScanning(false);
    }
  }

  function handleManual(e: React.FormEvent) {
    e.preventDefault();
    if (manualCode.trim()) handleScan(manualCode.trim());
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">📷 Scan Code</h1>
      <p className="text-sm text-muted-foreground text-center">
        Scan a learner card to open their page, or scan a reward ticket to redeem it.
      </p>

      {/* Camera */}
      <Card>
        <CardContent className="py-4 space-y-4">
          {scanning ? (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-4 border-dashed border-white/40 rounded-lg m-8" />
              <Button variant="secondary" size="sm" className="absolute bottom-3 right-3"
                onClick={() => setScanning(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={startScanning} className="w-full" size="lg">
              📷 Open Camera
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Manual entry */}
      <Card>
        <CardContent className="py-4">
          <form onSubmit={handleManual} className="flex gap-2">
            <Input value={manualCode} onChange={(e) => setManualCode(e.target.value)}
              placeholder="Or paste a code..." className="flex-1" />
            <Button type="submit">Go</Button>
          </form>
        </CardContent>
      </Card>

      {/* Confirm Redemption */}
      {pendingRedeem && (
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="py-5 text-center space-y-3">
            <p className="text-lg font-bold">Confirm Redemption</p>
            <p className="text-sm text-muted-foreground">
              Redeem <span className="font-semibold text-foreground">{pendingRedeem.rewardName}</span>?
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={cancelRedeem}>Cancel</Button>
              <Button onClick={confirmRedeem}>Yes, Redeem</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status */}
      {statusMsg && !pendingRedeem && (
        <div className={`text-center p-4 rounded-lg ${
          status === "success" ? "bg-green-50 text-green-700" :
          status === "error" ? "bg-red-50 text-red-600" :
          "bg-muted text-muted-foreground"
        }`}>
          <p className="font-medium">{statusMsg}</p>
        </div>
      )}
    </div>
  );
}

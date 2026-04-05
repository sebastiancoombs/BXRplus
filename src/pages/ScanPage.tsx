import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useClientByQR } from "@/hooks/useClients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ScanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qrFromUrl = searchParams.get("qr");
  const [manualCode, setManualCode] = useState(qrFromUrl ?? "");
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(qrFromUrl);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { client, loading } = useClientByQR(scannedCode ?? undefined);

  // Navigate when client found
  useEffect(() => {
    if (client) {
      navigate(`/clients/${client.id}`);
    }
  }, [client, navigate]);

  async function startScanning() {
    setScanning(true);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      if (devices.length === 0) {
        alert("No camera found");
        setScanning(false);
        return;
      }
      // Prefer back camera
      const backCam = devices.find((d: MediaDeviceInfo) => d.label.toLowerCase().includes("back")) ?? devices[0];
      reader.decodeFromVideoDevice(backCam.deviceId, videoRef.current!, (result: any) => {
        if (result) {
          setScannedCode(result.getText());
          setScanning(false);
        }
      });
    } catch (err) {
      console.error("Camera error:", err);
      setScanning(false);
    }
  }

  function handleManual(e: React.FormEvent) {
    e.preventDefault();
    if (manualCode.trim()) {
      setScannedCode(manualCode.trim());
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">📷 Scan Client Card</h1>

      {/* Camera Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Camera Scanner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {scanning ? (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-4 border-dashed border-white/50 rounded-lg m-8" />
            </div>
          ) : (
            <Button onClick={startScanning} className="w-full" size="lg">
              📷 Open Camera
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManual} className="flex gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter QR code..."
              className="flex-1"
            />
            <Button type="submit">Go</Button>
          </form>
        </CardContent>
      </Card>

      {loading && <p className="text-center text-muted-foreground">Looking up client...</p>}
      {scannedCode && !loading && !client && (
        <p className="text-center text-red-500">No client found for that code.</p>
      )}
    </div>
  );
}

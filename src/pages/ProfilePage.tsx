import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export default function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    await supabase.from("profiles").update({ full_name: fullName }).eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSaved(false);

    if (newPassword.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords don't match.");
      return;
    }

    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwError(error.message);
    } else {
      setPwSaved(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwSaved(false), 2000);
    }
    setPwSaving(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">My Profile</h1>

      {/* Profile Info */}
      <Card>
        <CardContent className="py-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {(profile?.full_name ?? "?")[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-lg">{profile?.full_name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {/* Role is per-client, not per-account */}
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3 pt-2 border-t">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>
            {/* Support role is set per learner on the Support Team page */}
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              {saved && <span className="text-sm text-green-600">✓ Saved</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardContent className="py-5">
          <p className="font-medium mb-3">Change Password</p>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {pwError && <p className="text-sm text-red-500">{pwError}</p>}
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={pwSaving}>
                {pwSaving ? "Updating..." : "Update Password"}
              </Button>
              {pwSaved && <span className="text-sm text-green-600">✓ Password updated</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card className="border-destructive/30">
        <CardContent className="py-5">
          <p className="font-medium text-destructive mb-2">Sign Out</p>
          <p className="text-sm text-muted-foreground mb-3">
            You'll need to sign in again to access your account.
          </p>
          <Button variant="destructive" onClick={signOut}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

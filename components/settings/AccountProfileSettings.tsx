"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Save, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AccountProfileSettings({
  initialName,
  email,
  onNameUpdated,
}: {
  initialName: string;
  email: string;
  onNameUpdated: (name: string) => void;
}) {
  const [fullName, setFullName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => setFullName(initialName), [initialName]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    const name = fullName.trim();
    if (!name) return;

    setSavingName(true);
    setNameSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [{ error: profileError }, { error: authError }] = await Promise.all([
        supabase.from("profiles").update({ full_name: name }).eq("id", user.id),
        supabase.auth.updateUser({ data: { full_name: name } }),
      ]);
      if (!profileError && !authError) {
        onNameUpdated(name);
        setNameSaved(true);
        window.setTimeout(() => setNameSaved(false), 2000);
      }
    }
    setSavingName(false);
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
    } else {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated.");
    }
    setSavingPassword(false);
  }

  const fieldClass = "h-11 w-full rounded-xl border border-[#e0ddd5] bg-[#f7f5f0] px-4 text-sm text-[#3d3b33] outline-none transition-colors focus:border-[#c2956e] dark:border-[#333] dark:bg-[#252525] dark:text-white";

  return (
    <section className="mb-6 grid gap-6 rounded-[2.5rem] border border-[#ebe8e2] bg-white p-6 shadow-sm dark:border-[#2a2a2a] dark:bg-[#1a1a1a] md:grid-cols-2 md:p-8">
      <form onSubmit={saveProfile} className="space-y-4">
        <div className="flex items-center gap-3">
          <UserRound size={20} className="text-[#c2956e]" />
          <div>
            <h3 className="font-semibold text-[#3d3b33] dark:text-white">Account information</h3>
            <p className="text-xs text-[#888]">Used across your BXR+ care team.</p>
          </div>
        </div>
        <label className="block space-y-1.5 text-xs font-semibold uppercase tracking-wider text-[#888]">
          Full name
          <input className={fieldClass} value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        </label>
        <label className="block space-y-1.5 text-xs font-semibold uppercase tracking-wider text-[#888]">
          Email
          <input className={`${fieldClass} opacity-65`} value={email} disabled />
        </label>
        <button disabled={savingName} className="flex h-10 items-center gap-2 rounded-xl bg-[#c2956e] px-4 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50">
          {nameSaved ? <CheckCircle2 size={15} /> : <Save size={15} />}
          {savingName ? "Saving…" : nameSaved ? "Saved" : "Save profile"}
        </button>
      </form>

      <form onSubmit={changePassword} className="space-y-4 md:border-l md:border-[#ebe8e2] md:pl-6 dark:md:border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <KeyRound size={20} className="text-[#c2956e]" />
          <div>
            <h3 className="font-semibold text-[#3d3b33] dark:text-white">Change password</h3>
            <p className="text-xs text-[#888]">Use at least six characters.</p>
          </div>
        </div>
        <input
          type="password"
          className={fieldClass}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="New password"
          minLength={6}
          required
        />
        <input
          type="password"
          className={fieldClass}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm password"
          required
        />
        {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
        {passwordMessage && <p className="text-sm text-emerald-600">{passwordMessage}</p>}
        <button disabled={savingPassword} className="h-10 rounded-xl border border-[#c2956e] px-4 text-xs font-bold uppercase tracking-wider text-[#9a704e] disabled:opacity-50 dark:text-[#d1a784]">
          {savingPassword ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}

"use client";

import { Bell, Check, Monitor, Moon, Paintbrush, Sun, User, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { authErrorMessage, updateProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useOS } from "@/stores/os";

const CATEGORIES = [
  { id: "profile", label: "Profile", icon: User, color: "var(--app-chat)" },
  { id: "appearance", label: "Appearance", icon: Paintbrush, color: "var(--app-snippets)" },
  { id: "notifications", label: "Notifications", icon: Bell, color: "var(--app-projects)" },
  { id: "members", label: "Members", icon: Users, color: "var(--app-members)" },
] as const;

const ACCENTS = [
  { name: "Blue", value: "#007aff" },
  { name: "Purple", value: "#bf5af2" },
  { name: "Pink", value: "#ff375f" },
  { name: "Orange", value: "#ff9f0a" },
  { name: "Green", value: "#30d158" },
  { name: "Graphite", value: "#8e8e93" },
];

function Toggle({ defaultOn = false, label }: { defaultOn?: boolean; label: string }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => setOn((v) => !v)}
      className={cn(
        "relative h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors",
        on ? "bg-success" : "bg-faint/40",
      )}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-separator py-3 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsApp() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]["id"]>("appearance");
  const { theme, setTheme } = useTheme();
  const accent = useOS((s) => s.accent);
  const setAccent = useOS((s) => s.setAccent);
  const user = useOS((s) => s.user);
  const setSession = useOS((s) => s.setSession);
  const email = user?.email ?? "";

  const [pName, setPName] = useState(user?.displayName ?? "");
  const [pTag, setPTag] = useState(user?.devTag ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const dirty = pName !== (user?.displayName ?? "") || pTag !== (user?.devTag ?? "");

  const saveProfile = async () => {
    setSaving(true);
    setProfileError(null);
    setSaved(false);
    try {
      const updated = await updateProfile({ displayName: pName.trim(), devTag: pTag.trim() });
      setSession(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setProfileError(authErrorMessage(e).message);
    } finally {
      setSaving(false);
    }
  };

  const themeOptions = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "Auto", icon: Monitor },
  ];

  return (
    <div className="flex min-h-0 flex-1">
      {/* Sidebar categories */}
      <div className="w-52 shrink-0 border-r border-separator bg-sidebar p-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              cat === c.id ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-hover",
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md text-white" style={{ background: c.color }}>
              <c.icon className="h-3.5 w-3.5" />
            </span>
            {c.label}
          </button>
        ))}
      </div>

      {/* Pane */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        <div className="mx-auto max-w-xl">
          {cat === "profile" && (
            <section>
              <div className="mb-6 flex items-center gap-4">
                <Avatar name={pName || email} size={64} />
                <div>
                  <p className="text-lg font-semibold">{pName || "Your name"}</p>
                  <p className="text-sm text-muted">@{pTag || "devtag"}</p>
                </div>
              </div>

              {profileError && (
                <div className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {profileError}
                </div>
              )}

              <Row label="Display name">
                <input
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  maxLength={100}
                  className="w-56 rounded-lg border border-separator bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
                />
              </Row>
              <Row label="DevTag" desc="Your unique @handle">
                <div className="flex w-56 items-center rounded-lg border border-separator bg-surface focus-within:border-accent">
                  <span className="pl-3 text-sm text-muted">@</span>
                  <input
                    value={pTag}
                    onChange={(e) => setPTag(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    maxLength={30}
                    placeholder="devtag"
                    className="w-full bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-faint"
                  />
                </div>
              </Row>
              <Row label="Email" desc="Used for sign-in and notifications">
                <span className="text-sm text-muted">{email}</span>
              </Row>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving || !dirty || pTag.length < 3 || pName.trim().length < 1}
                  className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
                {saved && (
                  <span className="flex items-center gap-1 text-sm text-success">
                    <Check className="h-4 w-4" /> Saved
                  </span>
                )}
              </div>
            </section>
          )}

          {cat === "appearance" && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Appearance</h2>
              <p className="mb-2 text-sm font-medium">Theme</p>
              <div className="mb-6 grid grid-cols-3 gap-2">
                {themeOptions.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
                      theme === t.id ? "border-accent bg-accent/5" : "border-separator hover:bg-hover",
                    )}
                  >
                    <t.icon className="h-5 w-5" />
                    <span className="text-sm">{t.label}</span>
                  </button>
                ))}
              </div>
              <p className="mb-2 text-sm font-medium">Accent color</p>
              <div className="flex gap-3">
                {ACCENTS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAccent(a.value)}
                    aria-label={a.name}
                    title={a.name}
                    className={cn(
                      "h-8 w-8 cursor-pointer rounded-full transition",
                      accent === a.value ? "ring-2 ring-offset-2 ring-offset-surface" : "hover:scale-110",
                    )}
                    style={{ background: a.value, ["--tw-ring-color"]: a.value } as React.CSSProperties}
                  />
                ))}
              </div>
            </section>
          )}

          {cat === "notifications" && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Notifications</h2>
              <Row label="Direct messages" desc="When someone mentions or DMs you"><Toggle defaultOn label="Direct messages" /></Row>
              <Row label="Task assignments" desc="When a task is assigned to you"><Toggle defaultOn label="Task assignments" /></Row>
              <Row label="Snippet comments"><Toggle label="Snippet comments" /></Row>
              <Row label="Weekly digest"><Toggle defaultOn label="Weekly digest" /></Row>
            </section>
          )}

          {cat === "members" && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Workspace members</h2>
              <p className="text-sm text-muted">Manage roles and invitations from the Members app in the dock.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

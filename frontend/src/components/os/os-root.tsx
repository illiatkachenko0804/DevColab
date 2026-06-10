"use client";

import { useEffect, useState } from "react";
import { fetchMe } from "@/lib/auth";
import { useOS } from "@/stores/os";
import { Desktop } from "./desktop";
import { LoginScreen } from "./login-screen";

function Splash() {
  return (
    <div
      className="flex h-dvh w-full items-center justify-center"
      style={{ background: "radial-gradient(120% 120% at 20% 0%, #2b6cb0 0%, #1a365d 38%, #0b1020 100%)" }}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    </div>
  );
}

export function OSRoot() {
  const loggedIn = useOS((s) => s.loggedIn);
  const setSession = useOS((s) => s.setSession);
  const [checking, setChecking] = useState(true);

  // Restore the session from the httpOnly cookie on load.
  useEffect(() => {
    let active = true;
    fetchMe()
      .then((u) => active && setSession(u))
      .catch(() => {})
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, [setSession]);

  if (checking) return <Splash />;
  return loggedIn ? <Desktop /> : <LoginScreen />;
}

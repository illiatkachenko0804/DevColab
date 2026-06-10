"use client";

import { useEffect, useState } from "react";
import { fetchMe } from "@/lib/auth";
import { listMyWorkspaces } from "@/lib/workspaces";
import { useOS } from "@/stores/os";
import { CreateProjectScreen } from "./create-project-screen";
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
  const workspaces = useOS((s) => s.workspaces);
  const workspacesLoaded = useOS((s) => s.workspacesLoaded);
  const setSession = useOS((s) => s.setSession);
  const setWorkspaces = useOS((s) => s.setWorkspaces);
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

  // Once authenticated, load the user's projects.
  useEffect(() => {
    if (!loggedIn || workspacesLoaded) return;
    let active = true;
    listMyWorkspaces()
      .then((ws) => active && setWorkspaces(ws))
      .catch(() => active && setWorkspaces([]));
    return () => {
      active = false;
    };
  }, [loggedIn, workspacesLoaded, setWorkspaces]);

  if (checking) return <Splash />;
  if (!loggedIn) return <LoginScreen />;
  if (!workspacesLoaded) return <Splash />;
  if (workspaces.length === 0) return <CreateProjectScreen />;
  return <Desktop />;
}

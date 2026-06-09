"use client";

import { useOS } from "@/stores/os";
import { Desktop } from "./desktop";
import { LoginScreen } from "./login-screen";

export function OSRoot() {
  const loggedIn = useOS((s) => s.loggedIn);
  return loggedIn ? <Desktop /> : <LoginScreen />;
}

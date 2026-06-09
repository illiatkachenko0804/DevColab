"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Ping = { status: string; time: string };

export function HealthCheck() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ping"],
    queryFn: () => api<Ping>("/api/ping"),
    retry: false,
  });

  const dotClass = isLoading
    ? "bg-yellow-500"
    : isError
      ? "bg-red-500"
      : "bg-green-500";

  const label = isLoading
    ? "Connecting to API…"
    : isError
      ? "API unreachable (is the backend running on :8080?)"
      : `API healthy · ${data?.status}`;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-black/10 px-4 py-3 text-sm dark:border-white/15">
      <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
      <span className="opacity-80">{label}</span>
    </div>
  );
}

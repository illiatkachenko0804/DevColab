import { ThemeToggle } from "@/components/theme-toggle";
import { HealthCheck } from "@/components/health-check";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between">
        <span className="font-mono text-sm tracking-tight opacity-60">
          devcollab
        </span>
        <ThemeToggle />
      </header>

      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">DevCollab</h1>
        <p className="text-lg opacity-70">
          Real-time developer collaboration — project spaces, chat, Kanban
          boards, and code snippets.
        </p>
      </div>

      <HealthCheck />

      <footer className="mt-auto pt-8 text-sm opacity-50">
        Phase 0 scaffold · Next.js 16 + Spring Boot 3.5
      </footer>
    </main>
  );
}

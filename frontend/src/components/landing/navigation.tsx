import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-separator glass-strong text-foreground transition-all duration-300">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="h-8 w-8 rounded bg-gradient-to-br from-accent to-[#64d2ff] p-[2px] shadow-sm group-hover:shadow-md transition-shadow">
            <div className="h-full w-full rounded-[6px] bg-background flex items-center justify-center">
              <span className="font-bold text-accent text-sm tracking-tighter">C</span>
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight">Collabsy</span>
        </Link>
        <div className="flex items-center space-x-6">
          <Link href="/dashboard" className="text-sm font-medium">
            <Button variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-md transition-transform hover:scale-105 active:scale-95">
              Open App
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

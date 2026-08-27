import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-separator bg-surface/50 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-6 md:order-2">
          <Link href="/privacy" className="text-sm text-muted hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-sm text-muted hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link href="https://github.com/illiatkachenko0804/DevColab" target="_blank" className="text-sm text-muted hover:text-foreground transition-colors">
            GitHub
          </Link>
        </div>
        <div className="mt-8 md:order-1 md:mt-0">
          <p className="text-center text-sm leading-5 text-faint">
            &copy; {new Date().getFullYear()} Collabsy, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

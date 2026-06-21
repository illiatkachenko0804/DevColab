"use client";

import { Check, Copy } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SUPPORTED = new Set(["ts", "tsx", "js", "jsx", "css", "json", "bash", "html"]);
const mapLang = (l: string) => (SUPPORTED.has(l) ? l : "text");

export function CodeBlock({
  code,
  lang,
  className,
  copyable = true,
  minimal = false,
}: {
  code: string;
  lang: string;
  className?: string;
  copyable?: boolean;
  minimal?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    import("shiki")
      .then(({ codeToHtml }) =>
        codeToHtml(code, {
          lang: mapLang(lang),
          theme: resolvedTheme === "dark" ? "github-dark" : "github-light",
        }),
      )
      .then((out) => active && setHtml(out))
      .catch(() => active && setHtml(null));
    return () => {
      active = false;
    };
  }, [code, lang, resolvedTheme]);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  if (minimal) {
    return html ? (
      <div className={cn("font-mono [&_pre]:!bg-transparent [&_pre]:m-0 [&_pre]:p-0", className)} dangerouslySetInnerHTML={{ __html: html }} />
    ) : (
      <pre className={cn("font-mono m-0 p-0 text-foreground/80", className)}>{code}</pre>
    );
  }

  return (
    <div
      className={cn(
        "group/code relative overflow-hidden rounded-lg border border-separator bg-background/60 text-[13px] [&_pre]:!bg-transparent [&_pre]:overflow-x-auto [&_pre]:p-3.5",
        className,
      )}
    >
      <span className="absolute left-3 top-2.5 z-10 font-mono text-[10px] uppercase tracking-wide text-faint">
        {lang}
      </span>
      {copyable && (
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          className="absolute right-2 top-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-faint opacity-0 transition hover:bg-hover hover:text-foreground group-hover/code:opacity-100"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      )}
      {html ? (
        <div className="pt-3 font-mono" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="overflow-x-auto p-3.5 pt-6 font-mono text-foreground/80">
          {code}
        </pre>
      )}
    </div>
  );
}

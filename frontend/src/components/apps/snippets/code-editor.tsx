import { useRef, useEffect, useState, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/ui/code-block";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  disabled?: boolean;
  className?: string;
}

export function CodeEditor({ value, onChange, language, disabled, className }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [scrollPos, setScrollPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setLineCount(value.split("\n").length);
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;

    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;

    // Handle Tab
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Tab: Dedent
        // (Simplified for MVP, would normally look at current line and remove spaces)
      } else {
        // Insert 2 spaces
        const newVal = val.substring(0, start) + "  " + val.substring(end);
        onChange(newVal);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    }

    // Handle Auto-close Brackets
    const pairs: Record<string, string> = {
      "{": "}",
      "(": ")",
      "[": "]",
      "\"": "\"",
      "'": "'",
      "`": "`"
    };

    if (pairs[e.key]) {
      e.preventDefault();
      const newVal = val.substring(0, start) + e.key + pairs[e.key] + val.substring(end);
      onChange(newVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
    }

    // Handle Auto-indent on Enter
    if (e.key === "Enter") {
      e.preventDefault();
      const linesBeforeCursor = val.substring(0, start).split("\n");
      const currentLine = linesBeforeCursor[linesBeforeCursor.length - 1];
      const indentMatch = currentLine.match(/^\s*/);
      let indent = indentMatch ? indentMatch[0] : "";

      // Add extra indent if previous line ends with specific chars
      if (currentLine.match(/[{([:]\s*$/)) {
        indent += "  ";
      }

      const newVal = val.substring(0, start) + "\n" + indent + val.substring(end);
      onChange(newVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
      }, 0);
    }

    // Handle Cmd+D (Duplicate line)
    if ((e.metaKey || e.ctrlKey) && e.key === "d") {
      e.preventDefault();
      const lines = val.split("\n");
      let currentLength = 0;
      let lineIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        currentLength += lines[i].length + 1; // +1 for \n
        if (currentLength > start) {
          lineIndex = i;
          break;
        }
      }
      const lineToDuplicate = lines[lineIndex];
      lines.splice(lineIndex, 0, lineToDuplicate);
      onChange(lines.join("\n"));
    }

    // Handle Cmd+/ (Toggle comment)
    if ((e.metaKey || e.ctrlKey) && e.key === "/") {
      e.preventDefault();
      // Simple MVP toggle (// for everything right now, would be lang-aware in prod)
      const lines = val.split("\n");
      let currentLength = 0;
      let lineIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        currentLength += lines[i].length + 1;
        if (currentLength > start) {
          lineIndex = i;
          break;
        }
      }
      let currentLine = lines[lineIndex];
      if (currentLine.trim().startsWith("//")) {
        currentLine = currentLine.replace(/\/\/\s?/, "");
      } else {
        currentLine = "// " + currentLine;
      }
      lines[lineIndex] = currentLine;
      onChange(lines.join("\n"));
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    setScrollPos({
      top: e.currentTarget.scrollTop,
      left: e.currentTarget.scrollLeft
    });
  };

  return (
    <div className={cn("relative flex h-full overflow-hidden rounded-md border border-separator bg-surface", className)}>
      {/* Line Numbers Gutter */}
      <div 
        className="w-12 shrink-0 select-none bg-surface/50 border-r border-separator text-right text-muted-foreground pt-4 pr-3 font-mono text-[13px] leading-6 overflow-hidden"
      >
        <div style={{ transform: `translateY(-${scrollPos.top}px)` }}>
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
      </div>

      {/* Editor Container */}
      <div className="relative flex-1 overflow-hidden">
        {/* Shiki Highlight Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none p-4 font-mono text-[13px] leading-6"
          style={{ transform: `translate(-${scrollPos.left}px, -${scrollPos.top}px)` }}
        >
          <CodeBlock code={value || " "} lang={language} minimal={true} className="bg-transparent m-0 p-0 shadow-none !text-[13px] !leading-6" />
        </div>

        {/* Textarea Overlay */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          disabled={disabled}
          spellCheck={false}
          className="absolute inset-0 w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-6 text-transparent caret-foreground outline-none whitespace-pre overflow-auto z-10"
        />
      </div>
    </div>
  );
}

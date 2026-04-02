import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check, FileText } from "lucide-react";
import type { Source } from "@/hooks/use-chats";
import { cn } from "@/lib/utils";
import "highlight.js/styles/github-dark-dimmed.css";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[] | null;
}

// ── Inline source badge (green star, hoverable) ────────────────────────

function InlineSourceBadge({ title }: { title: string }) {
  return (
    <span className="relative inline-flex group align-super ml-0.5">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-400 cursor-default text-[10px] leading-none">
        ✦
      </span>
      {/* Tooltip */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-md bg-popover border border-border shadow-lg text-[11px] text-foreground whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
        <FileText className="w-3 h-3 inline-block mr-1 text-emerald-400 -mt-0.5" />
        {title}
      </span>
    </span>
  );
}

// ── Parse [[src:Title]] markers out of text ─────────────────────────────

const SRC_REGEX = /\[\[src:(.*?)\]\]/g;

function stripSourceMarkers(text: string): string {
  return text.replace(SRC_REGEX, "");
}

function renderWithInlineSources(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(SRC_REGEX)) {
    const idx = match.index!;
    if (idx > lastIndex) {
      parts.push(text.slice(lastIndex, idx));
    }
    parts.push(
      <InlineSourceBadge key={`src-${idx}`} title={match[1].trim()} />
    );
    lastIndex = idx + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function hasSourceMarkers(text: string): boolean {
  return SRC_REGEX.test(text);
}

// ── Code block with syntax highlighting ─────────────────────────────────

function CodeBlock({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const code = String(children).replace(/\n$/, "");

  // Inline code
  if (!match) {
    return (
      <code
        className="px-1.5 py-0.5 rounded bg-muted text-primary text-[13px] font-mono"
        {...props}
      >
        {children}
      </code>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/80 border-b border-border">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {match[1]}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="!m-0 !rounded-none !border-0 overflow-x-auto">
        <code className={cn(className, "text-[13px] leading-relaxed")} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

// ── Text node that parses [[src:...]] inside rendered markdown ──────────

function TextWithSources({
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) {
  if (typeof children === "string" && hasSourceMarkers(children)) {
    return <span {...props}>{renderWithInlineSources(children)}</span>;
  }

  // Handle arrays of children (mixed text + elements)
  if (Array.isArray(children)) {
    return (
      <span {...props}>
        {children.map((child, i) => {
          if (typeof child === "string" && hasSourceMarkers(child)) {
            return <span key={i}>{renderWithInlineSources(child)}</span>;
          }
          return child;
        })}
      </span>
    );
  }

  return <>{children}</>;
}

// ── Sources summary badge (bottom of message) ──────────────────────────

function SourcesSummary({ sources }: { sources: Source[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400/80 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors"
      >
        <span className="text-[10px]">✦</span>
        {sources.length} source{sources.length > 1 ? "s" : ""} used
      </button>

      {expanded && (
        <div className="mt-2 ml-1 pl-3 border-l-2 border-emerald-500/20 space-y-2">
          {sources.map((source, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <FileText className="w-3 h-3 mt-0.5 shrink-0 text-emerald-400/60" />
              <div>
                <p className="text-[12px] font-medium text-foreground/80">
                  {source.doc_title}
                </p>
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                  {source.chunk_text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main bubble ─────────────────────────────────────────────────────────

export function MessageBubble({ role, content, sources }: MessageBubbleProps) {
  const isUser = role === "user";

  // Strip [[src:...]] from markdown so ReactMarkdown doesn't render raw markers,
  // but we inject them back via the custom `p` component that processes text nodes.
  const displayContent = content;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-card border border-border rounded-bl-md"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:bg-transparent [&_pre]:p-0">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                code: CodeBlock as any,
                p: ({ children, ...props }) => (
                  <p {...props}>
                    <TextWithSources>{children}</TextWithSources>
                  </p>
                ),
                li: ({ children, ...props }) => (
                  <li {...props}>
                    <TextWithSources>{children}</TextWithSources>
                  </li>
                ),
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
        )}

        {sources && sources.length > 0 && <SourcesSummary sources={sources} />}
      </div>
    </div>
  );
}

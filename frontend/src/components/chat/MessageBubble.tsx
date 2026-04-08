import { useState, useRef, type ReactNode } from "react";
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

// ── Strip [[src:...]] from content before rendering ─────────────────────

function stripAndCollectSources(text: string): {
  cleaned: string;
  inlineSources: string[];
} {
  const inlineSources: string[] = [];
  const cleaned = text.replace(/\[\[src:(.*?)\]\]/g, (_match, title) => {
    const trimmed = title.trim();
    if (!inlineSources.includes(trimmed)) {
      inlineSources.push(trimmed);
    }
    // Replace with a numbered marker that we render as a dot
    const idx = inlineSources.indexOf(trimmed) + 1;
    return `{{cite:${idx}}}`;
  });
  return { cleaned, inlineSources };
}

// ── Tiny superscript dot that scrolls to sources ────────────────────────

function CiteDot({
  index,
  onClickSources,
}: {
  index: number;
  onClickSources: () => void;
}) {
  return (
    <sup
      onClick={onClickSources}
      className="inline-flex items-center justify-center ml-0.5 w-[14px] h-[14px] rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold cursor-pointer hover:bg-emerald-500/30 transition-colors select-none"
      title="View source"
    >
      {index}
    </sup>
  );
}

// ── Parse {{cite:N}} in rendered text nodes ─────────────────────────────

const CITE_REGEX = /\{\{cite:(\d+)\}\}/g;

function renderWithCites(
  text: string,
  onClickSources: () => void
): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CITE_REGEX)) {
    const idx = match.index!;
    if (idx > lastIndex) {
      parts.push(text.slice(lastIndex, idx));
    }
    parts.push(
      <CiteDot
        key={`cite-${idx}`}
        index={parseInt(match[1])}
        onClickSources={onClickSources}
      />
    );
    lastIndex = idx + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function hasCiteMarkers(text: string): boolean {
  return text.includes("{{cite:");
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
        <code
          className={cn(className, "text-[13px] leading-relaxed")}
          {...props}
        >
          {children}
        </code>
      </pre>
    </div>
  );
}

// ── Text wrapper that replaces {{cite:N}} in children ───────────────────

function TextWithCites({
  children,
  onClickSources,
}: {
  children?: React.ReactNode;
  onClickSources: () => void;
}) {
  if (typeof children === "string" && hasCiteMarkers(children)) {
    return <>{renderWithCites(children, onClickSources)}</>;
  }

  if (Array.isArray(children)) {
    return (
      <>
        {children.map((child, i) => {
          if (typeof child === "string" && hasCiteMarkers(child)) {
            return (
              <span key={i}>{renderWithCites(child, onClickSources)}</span>
            );
          }
          return child;
        })}
      </>
    );
  }

  return <>{children}</>;
}

// ── Sources panel at bottom of message ──────────────────────────────────

function SourcesPanel({
  sources,
  inlineSources,
  expanded,
  onToggle,
  panelRef,
}: {
  sources: Source[];
  inlineSources: string[];
  expanded: boolean;
  onToggle: () => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
}) {
  // Merge: show inline-cited sources first (numbered), then any remaining from the API
  const numberedTitles = inlineSources;
  const extraSources = sources.filter(
    (s) => !numberedTitles.some((t) => s.doc_title.includes(t) || t.includes(s.doc_title))
  );

  const totalCount = numberedTitles.length + extraSources.length;
  if (totalCount === 0) return null;

  return (
    <div ref={panelRef} className="mt-2.5 pt-2 border-t border-border/30">
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400/80 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors"
      >
        <span className="text-[10px]">✦</span>
        {totalCount} source{totalCount > 1 ? "s" : ""}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {numberedTitles.map((title, i) => {
            const matchedSource = sources.find(
              (s) => s.doc_title.includes(title) || title.includes(s.doc_title)
            );
            return (
              <div key={`n-${i}`} className="flex items-start gap-2 text-[12px]">
                <span className="inline-flex items-center justify-center shrink-0 w-[16px] h-[16px] rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold mt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground/80 flex items-center gap-1">
                    <FileText className="w-3 h-3 shrink-0 text-emerald-400/60" />
                    {title}
                  </p>
                  {matchedSource && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      {matchedSource.chunk_text}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {extraSources.map((source, i) => (
            <div key={`e-${i}`} className="flex items-start gap-2 text-[12px]">
              <span className="inline-flex items-center justify-center shrink-0 w-[16px] h-[16px] rounded-full bg-muted text-muted-foreground text-[9px] font-bold mt-0.5">
                ·
              </span>
              <div className="min-w-0">
                <p className="font-medium text-foreground/80 flex items-center gap-1">
                  <FileText className="w-3 h-3 shrink-0 text-muted-foreground" />
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
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const sourcesPanelRef = useRef<HTMLDivElement>(null);

  const { cleaned, inlineSources } = isUser
    ? { cleaned: content, inlineSources: [] }
    : stripAndCollectSources(content);

  const scrollToSources = () => {
    setSourcesExpanded(true);
    setTimeout(() => {
      sourcesPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  };

  const hasSources =
    (sources && sources.length > 0) || inlineSources.length > 0;

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
                    <TextWithCites onClickSources={scrollToSources}>
                      {children}
                    </TextWithCites>
                  </p>
                ),
                li: ({ children, ...props }) => (
                  <li {...props}>
                    <TextWithCites onClickSources={scrollToSources}>
                      {children}
                    </TextWithCites>
                  </li>
                ),
              }}
            >
              {cleaned}
            </ReactMarkdown>
          </div>
        )}

        {hasSources && (
          <SourcesPanel
            sources={sources || []}
            inlineSources={inlineSources}
            expanded={sourcesExpanded}
            onToggle={() => setSourcesExpanded(!sourcesExpanded)}
            panelRef={sourcesPanelRef}
          />
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check, FileText, BookOpen } from "lucide-react";
import type { Source } from "@/hooks/use-chats";
import { cn } from "@/lib/utils";
import "highlight.js/styles/github-dark-dimmed.css";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[] | null;
}

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
      {/* Header bar */}
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
      {/* Code content */}
      <pre className="!m-0 !rounded-none !border-0 overflow-x-auto">
        <code className={cn(className, "text-[13px] leading-relaxed")} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

function SourcesBadge({ sources }: { sources: Source[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/8 text-primary/80 hover:bg-primary/15 hover:text-primary transition-colors"
      >
        <BookOpen className="w-3 h-3" />
        {sources.length} source{sources.length > 1 ? "s" : ""}
      </button>

      {expanded && (
        <div className="mt-2 ml-1 pl-3 border-l-2 border-primary/20 space-y-2">
          {sources.map((source, i) => (
            <div key={i} className="group">
              <div className="flex items-start gap-1.5">
                <FileText className="w-3 h-3 mt-0.5 shrink-0 text-primary/60" />
                <div>
                  <p className="text-[12px] font-medium text-foreground/80">
                    {source.doc_title}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                    {source.chunk_text}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MessageBubble({ role, content, sources }: MessageBubbleProps) {
  const isUser = role === "user";

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
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}

        {sources && sources.length > 0 && <SourcesBadge sources={sources} />}
      </div>
    </div>
  );
}

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import type { Source } from "@/hooks/use-chats";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[] | null;
}

export function MessageBubble({ role, content, sources }: MessageBubbleProps) {
  const [showSources, setShowSources] = useState(false);
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
          <div className="prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}

        {sources && sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showSources ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              {sources.length} source{sources.length > 1 ? "s" : ""}
            </button>
            {showSources && (
              <div className="mt-2 space-y-2">
                {sources.map((source, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs bg-muted/50 rounded-md p-2"
                  >
                    <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">
                        {source.doc_title}
                      </p>
                      <p className="text-muted-foreground line-clamp-2 mt-0.5">
                        {source.chunk_text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

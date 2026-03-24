import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useChatDetail, type Message, type Source } from "@/hooks/use-chats";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { GraduationCap } from "lucide-react";

export function ChatWindow() {
  const { chatId } = useParams();
  const { data: chat } = useChatDetail(chatId);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingSources, setStreamingSources] = useState<Source[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages, streamingContent, scrollToBottom]);

  const handleSend = async (content: string) => {
    if (!chatId) return;

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      sources: null,
      created_at: new Date().toISOString(),
    };

    queryClient.setQueryData(["chat", chatId], (old: typeof chat) => {
      if (!old) return old;
      return { ...old, messages: [...old.messages, tempUserMsg] };
    });

    setIsStreaming(true);
    setStreamingContent("");
    setStreamingSources([]);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`/api/chats/${chatId}/messages/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let sources: Source[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "text") {
                  fullContent += data.content;
                  setStreamingContent(fullContent);
                } else if (data.type === "sources") {
                  sources = data.content;
                  setStreamingSources(sources);
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
        }
      }

      // Replace streaming with final message
      setIsStreaming(false);
      setStreamingContent("");
      setStreamingSources([]);

      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    } catch {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  if (!chatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <GraduationCap className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Student Helper
        </h2>
        <p className="text-sm max-w-md text-center">
          Ask questions about your course materials. Start a new chat or select
          an existing one from the sidebar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
          {chat?.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              sources={msg.sources}
            />
          ))}
          {isStreaming && streamingContent && (
            <MessageBubble
              role="assistant"
              content={streamingContent}
              sources={streamingSources.length > 0 ? streamingSources : null}
            />
          )}
          {isStreaming && !streamingContent && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Source {
  doc_id: string;
  doc_title: string;
  chunk_text: string;
  score: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[] | null;
  created_at: string;
}

export interface ChatDetail extends Chat {
  messages: Message[];
}

export function useChats() {
  return useQuery<Chat[]>({
    queryKey: ["chats"],
    queryFn: async () => {
      const { data } = await api.get("/chats/");
      return data;
    },
  });
}

export function useChatDetail(chatId: string | undefined) {
  return useQuery<ChatDetail>({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const { data } = await api.get(`/chats/${chatId}`);
      return data;
    },
    enabled: !!chatId,
  });
}

export function useCreateChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (title: string | void) => {
      const { data } = await api.post("/chats/", { title: title || "New Chat" });
      return data as Chat;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chats"] }),
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (chatId: string) => {
      await api.delete(`/chats/${chatId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chats"] }),
  });
}

export function useRenameChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ chatId, title }: { chatId: string; title: string }) => {
      const { data } = await api.patch(`/chats/${chatId}`, { title });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chats"] }),
  });
}

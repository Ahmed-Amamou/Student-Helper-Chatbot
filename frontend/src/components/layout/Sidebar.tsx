import { useNavigate, useParams } from "react-router";
import {
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChats, useCreateChat, useDeleteChat } from "@/hooks/use-chats";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function Sidebar() {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const { data: chats } = useChats();
  const createChat = useCreateChat();
  const deleteChat = useDeleteChat();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const handleNewChat = async () => {
    const chat = await createChat.mutateAsync();
    navigate(`/chat/${chat.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteChat.mutateAsync(id);
    if (chatId === id) navigate("/chat");
  };

  return (
    <>
      {/* Toggle button when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 rounded-md hover:bg-muted transition-colors"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 z-40",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h1 className="text-lg font-semibold tracking-tight">Student Helper</h1>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat */}
        <div className="p-3">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2"
            variant="outline"
            disabled={createChat.isPending}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {chats?.map((chat) => (
            <div
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.id}`)}
              className={cn(
                "group flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-colors text-sm",
                chatId === chat.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="truncate flex-1">{chat.title}</span>
              <span className="text-xs text-muted-foreground hidden group-hover:hidden">
                {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
              </span>
              <button
                onClick={(e) => handleDelete(e, chat.id)}
                className="hidden group-hover:block p-1 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* User section */}
        <div className="border-t border-border p-3 space-y-1">
          {user?.role === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Shield className="w-4 h-4" />
              Admin Panel
            </button>
          )}
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Settings className="w-4 h-4" />
            {user?.full_name}
          </button>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}

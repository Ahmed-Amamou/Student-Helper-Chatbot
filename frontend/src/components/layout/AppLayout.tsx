import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300",
          sidebarOpen ? "ml-72" : "ml-0"
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}

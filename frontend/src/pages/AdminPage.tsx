import { useState } from "react";
import { DocumentUploader } from "@/components/admin/DocumentUploader";
import { DocumentTable } from "@/components/admin/DocumentTable";
import { cn } from "@/lib/utils";

type Tab = "documents" | "users";

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("documents");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage documents and users
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {(["documents", "users"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize",
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "documents" && (
          <div className="space-y-6">
            <DocumentUploader />
            <DocumentTable />
          </div>
        )}

        {tab === "users" && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            User management coming soon.
          </p>
        )}
      </div>
    </div>
  );
}

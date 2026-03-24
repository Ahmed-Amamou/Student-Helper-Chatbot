import { Trash2, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocuments, useDeleteDocument } from "@/hooks/use-documents";
import { formatDistanceToNow } from "date-fns";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentTable() {
  const { data: documents, isLoading } = useDocuments();
  const deleteDoc = useDeleteDocument();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!documents?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No documents uploaded yet.
      </p>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left px-4 py-3 font-medium">Document</th>
            <th className="text-left px-4 py-3 font-medium">Subject</th>
            <th className="text-left px-4 py-3 font-medium">Class</th>
            <th className="text-left px-4 py-3 font-medium">Sem</th>
            <th className="text-left px-4 py-3 font-medium">Type</th>
            <th className="text-left px-4 py-3 font-medium">Chunks</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium">Uploaded</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <span className="truncate block max-w-[180px]">
                      {doc.title}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase">
                      {doc.file_type} &middot; {formatSize(doc.file_size)}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {doc.subject || "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {doc.class_name || "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {doc.semester || "—"}
              </td>
              <td className="px-4 py-3">
                {doc.doc_type ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                    {doc.doc_type}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {doc.chunk_count}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    doc.status === "ready"
                      ? "bg-green-500/10 text-green-400"
                      : doc.status === "processing"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {doc.status}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDistanceToNow(new Date(doc.created_at), {
                  addSuffix: true,
                })}
              </td>
              <td className="px-4 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteDoc.mutate(doc.id)}
                  disabled={deleteDoc.isPending}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

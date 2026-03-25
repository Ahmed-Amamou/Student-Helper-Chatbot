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
    <div className="border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left px-3 py-2.5 font-medium">Document</th>
            <th className="text-left px-3 py-2.5 font-medium">Subject</th>
            <th className="text-left px-3 py-2.5 font-medium">Discipline</th>
            <th className="text-left px-3 py-2.5 font-medium w-12">Year</th>
            <th className="text-left px-3 py-2.5 font-medium w-12">Sem</th>
            <th className="text-left px-3 py-2.5 font-medium">Type</th>
            <th className="text-left px-3 py-2.5 font-medium w-16">Chunks</th>
            <th className="text-left px-3 py-2.5 font-medium">Status</th>
            <th className="text-left px-3 py-2.5 font-medium">Uploaded</th>
            <th className="px-3 py-2.5 w-10" />
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="truncate block max-w-[160px]" title={doc.title}>
                      {doc.title}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase">
                      {doc.file_type} &middot; {formatSize(doc.file_size)}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground max-w-[120px] truncate" title={doc.subject || ""}>
                {doc.subject || "—"}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[100px] truncate" title={doc.discipline || ""}>
                {doc.discipline || "—"}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {doc.year_of_study || "—"}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {doc.semester || "—"}
              </td>
              <td className="px-3 py-2.5">
                {doc.doc_type ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                    {doc.doc_type}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {doc.chunk_count}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    doc.status === "ready"
                      ? "bg-green-500/10 text-green-400"
                      : doc.status === "processing"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {doc.status === "processing" && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  {doc.status}
                </span>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap text-xs">
                {formatDistanceToNow(new Date(doc.created_at), {
                  addSuffix: true,
                })}
              </td>
              <td className="px-3 py-2.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteDoc.mutate(doc.id)}
                  disabled={deleteDoc.isPending}
                  className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
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

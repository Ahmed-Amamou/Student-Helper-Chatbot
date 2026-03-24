import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface DocumentMeta {
  subject?: string;
  class_name?: string;
  semester?: string;
  academic_year?: string;
  doc_type?: string;
}

export interface Document {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
  status: string;
  subject: string | null;
  class_name: string | null;
  semester: string | null;
  academic_year: string | null;
  doc_type: string | null;
  uploaded_by: string;
  created_at: string;
}

export function useDocuments() {
  return useQuery<Document[]>({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data } = await api.get("/documents/");
      return data;
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, meta }: { file: File; meta: DocumentMeta }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (meta.subject) formData.append("subject", meta.subject);
      if (meta.class_name) formData.append("class_name", meta.class_name);
      if (meta.semester) formData.append("semester", meta.semester);
      if (meta.academic_year) formData.append("academic_year", meta.academic_year);
      if (meta.doc_type) formData.append("doc_type", meta.doc_type);
      const { data } = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      await api.delete(`/documents/${docId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });
}

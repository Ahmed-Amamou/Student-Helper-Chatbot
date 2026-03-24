import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { useUploadDocument } from "@/hooks/use-documents";

export function DocumentUploader() {
  const upload = useUploadDocument();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        upload.mutate(file);
      }
    },
    [upload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground"
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
      {upload.isPending ? (
        <p className="text-sm text-muted-foreground">Uploading...</p>
      ) : isDragActive ? (
        <p className="text-sm text-primary">Drop files here</p>
      ) : (
        <>
          <p className="text-sm text-foreground font-medium">
            Drag & drop files here
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOCX, PPTX, TXT, MD
          </p>
        </>
      )}
    </div>
  );
}

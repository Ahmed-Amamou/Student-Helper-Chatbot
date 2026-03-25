import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUploadDocument, type DocumentMeta } from "@/hooks/use-documents";

const DOC_TYPES = ["cours", "td", "tp", "exam", "emploi", "other"];
const DISCIPLINES = [
  "Génie Informatique",
  "Génie Mécanique",
  "Génie Électrique",
  "Génie Civil",
  "Mathématiques Appliquées et Modélisation",
  "Génie Industriel",
];
const YEARS = [1, 2, 3];
const YEAR_SEMESTERS: Record<number, string[]> = {
  1: ["S1", "S2"],
  2: ["S3", "S4"],
  3: ["S5", "S6"],
};

export function DocumentUploader() {
  const { mutate, isPending, isSuccess, isError, uploadProgress } =
    useUploadDocument();
  const [files, setFiles] = useState<File[]>([]);
  const [meta, setMeta] = useState<DocumentMeta>({});

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const handleUpload = () => {
    for (const file of files) {
      mutate({ file, meta });
    }
    setFiles([]);
    setMeta({});
  };

  const handleYearChange = (val: string) => {
    const year = val ? parseInt(val) : undefined;
    setMeta({ ...meta, year_of_study: year, semester: undefined });
  };

  const availableSemesters = meta.year_of_study
    ? YEAR_SEMESTERS[meta.year_of_study] || []
    : [];

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
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        {isDragActive ? (
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

      {/* Queued files */}
      {files.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {files.length} file{files.length > 1 ? "s" : ""} selected:{" "}
          {files.map((f) => f.name).join(", ")}
        </div>
      )}

      {/* Metadata fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Subject
          </label>
          <Input
            placeholder="e.g. Analyse Numérique"
            value={meta.subject || ""}
            onChange={(e) => setMeta({ ...meta, subject: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Discipline
          </label>
          <select
            value={meta.discipline || ""}
            onChange={(e) => setMeta({ ...meta, discipline: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All disciplines</option>
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Year
          </label>
          <select
            value={meta.year_of_study || ""}
            onChange={(e) => handleYearChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All years</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y === 1 ? "1ère année" : y === 2 ? "2ème année" : "3ème année"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Semester
          </label>
          <select
            value={meta.semester || ""}
            onChange={(e) => setMeta({ ...meta, semester: e.target.value })}
            disabled={!meta.year_of_study}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="">
              {meta.year_of_study ? "Select semester" : "Select year first"}
            </option>
            {availableSemesters.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Document Type
          </label>
          <div className="flex gap-2 flex-wrap">
            {DOC_TYPES.map((t) => (
              <button
                key={t}
                onClick={() =>
                  setMeta({ ...meta, doc_type: meta.doc_type === t ? "" : t })
                }
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors capitalize ${
                  meta.doc_type === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Upload button + progress */}
      {files.length > 0 && !isPending && (
        <Button onClick={handleUpload} className="w-full">
          Upload {files.length} file{files.length > 1 ? "s" : ""}
        </Button>
      )}

      {isPending && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Uploading file...
            </div>
            {uploadProgress !== null && (
              <span className="text-xs font-medium text-primary">
                {uploadProgress}%
              </span>
            )}
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Post-upload status */}
      {isSuccess && (
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 rounded-md px-3 py-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          File uploaded — processing steps visible in the table below.
        </div>
      )}
      {isError && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          <XCircle className="w-4 h-4 shrink-0" />
          Upload failed. Please try again.
        </div>
      )}
    </div>
  );
}

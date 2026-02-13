import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, ImageIcon, FolderOpen } from "lucide-react";

interface ImageUploaderProps {
  onImagesSelected: (files: File[]) => void;
  isProcessing: boolean;
}

export default function ImageUploader({ onImagesSelected, isProcessing }: ImageUploaderProps) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    const newPreviews = imageFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const removeImage = (index: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearAll = () => {
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setPreviews([]);
  };

  const handleProcess = () => {
    onImagesSelected(previews.map((p) => p.file));
  };

  return (
    <Card className="border-2 border-dashed border-border">
      <CardContent className="p-6">
        <div
          className={`flex flex-col items-center justify-center rounded-lg p-8 transition-colors ${
            isDragging ? "bg-primary/10" : "bg-muted/30"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">
            Drag & drop exam sheet images here
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            or use the buttons below
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Select Images
            </Button>
            <Button
              variant="outline"
              onClick={() => folderInputRef.current?.click()}
              disabled={isProcessing}
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              Select Folder
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <input
            ref={folderInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {previews.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">
                {previews.length} image{previews.length !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={clearAll} disabled={isProcessing}>
                  Clear All
                </Button>
                <Button onClick={handleProcess} disabled={isProcessing || previews.length === 0}>
                  Process All
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {previews.map((p, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border">
                  <img
                    src={p.url}
                    alt={p.file.name}
                    className="w-full h-24 object-cover"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isProcessing}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <p className="text-[10px] p-1 truncate text-muted-foreground">
                    {p.file.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

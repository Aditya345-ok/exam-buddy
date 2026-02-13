import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, ScanLine } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";
import ResultsTable, { type ProcessedSheet } from "@/components/ResultsTable";
import { validateSheet, type ExtractedData } from "@/lib/validation";
import { exportToExcel } from "@/lib/excelExport";
import { supabase } from "@/integrations/supabase/client";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const Index = () => {
  const [results, setResults] = useState<ProcessedSheet[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showExportDialog, setShowExportDialog] = useState(false);
  const { toast } = useToast();

  const processImages = async (files: File[]) => {
    setIsProcessing(true);
    setResults([]);
    setProgress({ current: 0, total: files.length });

    const processed: ProcessedSheet[] = [];

    for (let i = 0; i < files.length; i++) {
      setProgress({ current: i + 1, total: files.length });
      const file = files[i];

      try {
        const imageBase64 = await fileToBase64(file);
        const { data, error } = await supabase.functions.invoke("ocr-extract", {
          body: { imageBase64, mimeType: file.type },
        });

        if (error) throw error;

        const extracted = data as ExtractedData;
        const validation = validateSheet(extracted);

        processed.push({
          imageName: file.name,
          regulation: extracted.regulation,
          data: extracted,
          validation,
        });
      } catch (err) {
        console.error(`Failed to process ${file.name}:`, err);
        toast({
          title: `Error processing ${file.name}`,
          description: err instanceof Error ? err.message : "OCR extraction failed",
          variant: "destructive",
        });
        processed.push({
          imageName: file.name,
          regulation: "Unknown",
          data: { regulation: "A3", writtenTotal: 0, bubbleTotal: 0 },
          validation: {
            calculatedTotal: 0,
            writtenTotal: 0,
            bubbleTotal: 0,
            status: "FAILED",
            remarks: "OCR extraction failed",
          },
        });
      }

      setResults([...processed]);
    }

    setIsProcessing(false);
    setShowExportDialog(true);
  };

  const passedCount = results.filter((r) => r.validation.status === "PASSED").length;
  const failedCount = results.filter((r) => r.validation.status === "FAILED").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <ScanLine className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-xl font-bold">OCR Exam Sheet Validator</h1>
            <p className="text-sm text-muted-foreground">
              Bulk process exam sheets · Auto-detect A3/R23 · Validate totals
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <ImageUploader onImagesSelected={processImages} isProcessing={isProcessing} />

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                Processing {progress.current} of {progress.total}...
              </span>
              <span>
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <Progress
              value={(progress.current / progress.total) * 100}
            />
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm">
                <span>Total: {results.length}</span>
                <span className="text-green-600">Passed: {passedCount}</span>
                <span className="text-destructive">Failed: {failedCount}</span>
              </div>
              <Button
                variant="outline"
                onClick={() => exportToExcel(results)}
                disabled={isProcessing}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
            <ResultsTable results={results} />
          </>
        )}
      </main>

      <AlertDialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Processing Complete</AlertDialogTitle>
            <AlertDialogDescription>
              {results.length} sheet{results.length !== 1 ? "s" : ""} processed.{" "}
              {passedCount} passed, {failedCount} failed. Download the Excel report?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, thanks</AlertDialogCancel>
            <AlertDialogAction onClick={() => exportToExcel(results)}>
              Download Excel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;

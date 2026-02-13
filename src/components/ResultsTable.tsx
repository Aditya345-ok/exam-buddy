import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { ExtractedData, ValidationResult } from "@/lib/validation";

export interface ProcessedSheet {
  imageName: string;
  regulation: string;
  data: ExtractedData;
  validation: ValidationResult;
}

interface ResultsTableProps {
  results: ProcessedSheet[];
}

export default function ResultsTable({ results }: ResultsTableProps) {
  if (results.length === 0) return null;

  const questionMarksDisplay = (data: ExtractedData) => {
    if (data.regulation === "A3" && data.questions) {
      return data.questions
        .filter((q) => q.a + q.b + q.c > 0 || q.total > 0)
        .map((q) => `Q${q.q}:${q.total}`)
        .join(", ");
    }
    if (data.regulation === "R23") {
      const parts: string[] = [];
      if (data.partA) {
        parts.push(
          "A[" + data.partA.map((q) => `${q.marks}`).join(",") + "]"
        );
      }
      if (data.partB) {
        parts.push(
          "B[" +
            data.partB.map((q) => `${q.i + q.ii + q.iii}`).join(",") +
            "]"
        );
      }
      return parts.join(" ");
    }
    return "-";
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Image Name</TableHead>
            <TableHead>Regulation</TableHead>
            <TableHead>Question Marks</TableHead>
            <TableHead className="text-right">Calculated</TableHead>
            <TableHead className="text-right">Written</TableHead>
            <TableHead className="text-right">Bubble</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Remarks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((r, i) => (
            <Collapsible key={i} asChild>
              <>
                <CollapsibleTrigger asChild>
                  <TableRow className="cursor-pointer">
                    <TableCell>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium max-w-[160px] truncate">
                      {r.imageName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.regulation}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">
                      {questionMarksDisplay(r.data)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r.validation.calculatedTotal}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r.validation.writtenTotal}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r.validation.bubbleTotal}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.validation.status === "PASSED"
                            ? "default"
                            : "destructive"
                        }
                        className={
                          r.validation.status === "PASSED"
                            ? "bg-green-600 hover:bg-green-700"
                            : ""
                        }
                      >
                        {r.validation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[250px] text-xs text-muted-foreground truncate">
                      {r.validation.remarks}
                    </TableCell>
                  </TableRow>
                </CollapsibleTrigger>
                <CollapsibleContent asChild>
                  <TableRow>
                    <TableCell colSpan={9} className="bg-muted/30">
                      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        {r.data.metadata && (
                          <>
                            {r.data.metadata.examName && (
                              <div>
                                <span className="font-medium">Exam:</span>{" "}
                                {r.data.metadata.examName}
                              </div>
                            )}
                            {r.data.metadata.branch && (
                              <div>
                                <span className="font-medium">Branch:</span>{" "}
                                {r.data.metadata.branch}
                              </div>
                            )}
                            {r.data.metadata.subjectCode && (
                              <div>
                                <span className="font-medium">Subject Code:</span>{" "}
                                {r.data.metadata.subjectCode}
                              </div>
                            )}
                            {r.data.metadata.subjectName && (
                              <div>
                                <span className="font-medium">Subject:</span>{" "}
                                {r.data.metadata.subjectName}
                              </div>
                            )}
                            {r.data.metadata.examinerName && (
                              <div>
                                <span className="font-medium">Examiner:</span>{" "}
                                {r.data.metadata.examinerName}
                              </div>
                            )}
                            {r.data.metadata.scrutinizerName && (
                              <div>
                                <span className="font-medium">Scrutinizer:</span>{" "}
                                {r.data.metadata.scrutinizerName}
                              </div>
                            )}
                          </>
                        )}
                        {r.data.marksInWords && (
                          <div>
                            <span className="font-medium">Marks in Words:</span>{" "}
                            {r.data.marksInWords}
                          </div>
                        )}
                        {r.data.regulation === "A3" && r.data.questions && (
                          <div className="col-span-full">
                            <span className="font-medium">Detailed Marks:</span>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {r.data.questions.map((q) => (
                                <span
                                  key={q.q}
                                  className="text-xs bg-muted px-2 py-1 rounded"
                                >
                                  Q{q.q}: {q.a}+{q.b}+{q.c}={q.total}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                </CollapsibleContent>
              </>
            </Collapsible>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

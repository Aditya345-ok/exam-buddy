import * as XLSX from "xlsx";
import type { ProcessedSheet } from "@/components/ResultsTable";

export function exportToExcel(results: ProcessedSheet[]) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Full Results
  const sheetData = results.map((r) => {
    const base: Record<string, unknown> = {
      "Image Name": r.imageName,
      "Regulation": r.regulation,
      "Bundle Number": r.data.bundleNumber || "",
      "Validation Number": r.data.validationNumber || "",
    };

    const qTotals: number[] = [];

    if (r.regulation === "A3" && r.data.questions) {
      r.data.questions.forEach((q) => {
        base[`Q${q.q}_a`] = q.a;
        base[`Q${q.q}_b`] = q.b;
        base[`Q${q.q}_c`] = q.c;
        base[`Q${q.q}_Total`] = q.total;
        qTotals.push(q.total);
      });
    } else if (r.regulation === "R23") {
      if (r.data.partA) {
        r.data.partA.forEach((q) => {
          base[`PartA_Q${q.q}`] = q.marks;
          qTotals.push(q.marks);
        });
      }
      if (r.data.partB) {
        r.data.partB.forEach((q) => {
          const subTotal = q.i + q.ii + q.iii;
          base[`PartB_Q${q.q}_i`] = q.i;
          base[`PartB_Q${q.q}_ii`] = q.ii;
          base[`PartB_Q${q.q}_iii`] = q.iii;
          qTotals.push(subTotal);
        });
      }
    }

    // Highest Score = max of individual question totals (Q1, Q2, Q3, ...)
    base["Highest Score"] = qTotals.length > 0 ? Math.max(...qTotals) : 0;

    base["Calculated Total"] = r.validation.calculatedTotal;
    base["Written Total"] = r.validation.writtenTotal;
    base["Bubble Total"] = r.validation.bubbleTotal;
    base["Status"] = r.validation.status;
    base["Remarks"] = r.validation.remarks;

    if (r.data.metadata) {
      base["Exam Name"] = r.data.metadata.examName || "";
      base["Branch"] = r.data.metadata.branch || "";
      base["Subject Code"] = r.data.metadata.subjectCode || "";
      base["Subject Name"] = r.data.metadata.subjectName || "";
      base["Examiner"] = r.data.metadata.examinerName || "";
      base["Scrutinizer"] = r.data.metadata.scrutinizerName || "";
    }

    return base;
  });

  const ws1 = XLSX.utils.json_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws1, "Results");

  // Sheet 2: Summary
  const passed = results.filter((r) => r.validation.status === "PASSED").length;
  const failed = results.filter((r) => r.validation.status === "FAILED").length;
  const summary = [
    { Metric: "Total Sheets Processed", Value: results.length },
    { Metric: "Passed", Value: passed },
    { Metric: "Failed", Value: failed },
  ];
  const ws2 = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, ws2, "Summary");

  XLSX.writeFile(wb, "exam_validation_report.xlsx");
}

export interface A3Question {
  q: number;
  a: number;
  b: number;
  c: number;
  total: number;
}

export interface R23PartAQuestion {
  q: number;
  marks: number;
}

export interface R23PartBQuestion {
  q: number;
  i: number;
  ii: number;
  iii: number;
}

export interface ExamMetadata {
  examName?: string;
  branch?: string;
  subjectCode?: string;
  subjectName?: string;
  examinerName?: string;
  scrutinizerName?: string;
}

export interface ExtractedData {
  regulation: "A3" | "R23";
  questions?: A3Question[];
  partA?: R23PartAQuestion[];
  partB?: R23PartBQuestion[];
  writtenTotal: number;
  bubbleTotal: number;
  marksInWords?: string;
  metadata?: ExamMetadata;
  bundleNumber?: string;
  validationNumber?: string;
}

export interface ValidationResult {
  calculatedTotal: number;
  writtenTotal: number;
  bubbleTotal: number;
  status: "PASSED" | "FAILED";
  remarks: string;
}

export function validateSheet(data: ExtractedData): ValidationResult {
  let calculatedTotal = 0;
  const remarks: string[] = [];

  if (data.regulation === "A3") {
    if (data.questions && data.questions.length > 0) {
      calculatedTotal = data.questions.reduce((sum, q) => {
        const subTotal = q.a + q.b + q.c;
        if (q.total > 0 && q.total !== subTotal) {
          // Use the written total per question if sub-marks don't add up
          return sum + q.total;
        }
        return sum + subTotal;
      }, 0);
    }
  } else if (data.regulation === "R23") {
    const partATotal = data.partA
      ? data.partA.reduce((sum, q) => sum + q.marks, 0)
      : 0;
    const partBTotal = data.partB
      ? data.partB.reduce((sum, q) => sum + q.i + q.ii + q.iii, 0)
      : 0;
    calculatedTotal = partATotal + partBTotal;
  }

  if (calculatedTotal !== data.writtenTotal) {
    remarks.push(`Calculated total (${calculatedTotal}) ≠ Written total (${data.writtenTotal})`);
  }
  if (calculatedTotal !== data.bubbleTotal) {
    remarks.push(`Calculated total (${calculatedTotal}) ≠ Bubble total (${data.bubbleTotal})`);
  }
  if (data.writtenTotal !== data.bubbleTotal) {
    remarks.push(`Written total (${data.writtenTotal}) ≠ Bubble total (${data.bubbleTotal})`);
  }

  const status = remarks.length === 0 ? "PASSED" : "FAILED";

  return {
    calculatedTotal,
    writtenTotal: data.writtenTotal,
    bubbleTotal: data.bubbleTotal,
    status,
    remarks: remarks.length > 0 ? remarks.join("; ") : "All totals match",
  };
}

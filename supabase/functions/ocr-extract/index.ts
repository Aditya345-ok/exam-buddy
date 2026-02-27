import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are a highly precise OCR system specialized in extracting marks from Indian university exam answer sheet cover pages. Accuracy is critical — every digit matters.

INSTRUCTIONS:
1. First, carefully examine the ENTIRE image before extracting any data.
2. Detect the regulation type (A3 or R23) based on the table structure.
3. Extract ALL question-wise marks with extreme care — read each digit individually.
4. Extract totals and metadata fields.

REGULATION DETECTION:
- If the sheet has a table with columns "Q No | a | b | c | Total" → regulation = "A3"
- If the sheet has "PART A", "PART B" sections with separate question numbering → regulation = "R23"

FOR A3 REGULATION sheets (MVGR college style):
- The table has columns: Q No, a, b, c, Total
- Questions are numbered 1 through 10
- Read each cell value VERY carefully. Pay attention to:
  * Handwritten digits that may look similar (1 vs 7, 3 vs 8, 5 vs 6, 0 vs 6)
  * Half marks (e.g., 2.5, 1.5) — preserve decimal values
  * Empty cells = 0, dashes = 0, crossed out = 0
  * If a cell has a correction/overwrite, use the FINAL corrected value
- "TOTAL MARKS (in figures)" is the handwritten total at the bottom
- OMR bubble circles: Read the filled/darkened bubbles for tens digit and units digit separately
- "Marks in Words": Read the handwritten words for tens and units place
- Verify: the total column for each question should equal a + b + c. If it doesn't, trust what's written in each individual cell.

FOR R23 REGULATION sheets:
- PART A typically has short answer questions (e.g., Q1-Q5) with single marks per question
- PART B has long answer questions with sub-parts labeled i, ii, iii (or a, b, c)
- Read each mark carefully, distinguishing between sub-part marks
- Extract total marks for Part A and Part B separately
- "TOTAL MARKS (in figures)" is the handwritten total
- OMR bubble circles: Read tens and units digits from filled bubbles

METADATA EXTRACTION:
- Exam Name: Usually at the top (e.g., "B.TECH IV SEMESTER REGULAR EXAMINATIONS")
- Branch: Department/stream (e.g., "CIVIL ENGINEERING", "CSE")
- Subject Code: Alphanumeric code (e.g., "R23MCIVT007")
- Subject Name: Full subject title
- Examiner's Name: Handwritten name near the bottom
- Scrutinizer's Name: Handwritten name near the bottom
- Bundle Number: A number identifying the bundle/packet of answer sheets (often printed or stamped)
- Validation Number: A serial/validation number on the sheet (often printed or handwritten)

CRITICAL RULES:
- Use tool calling to return structured data
- For crossed out, illegible, or dashed marks, use 0
- NEVER guess — if a digit is truly unreadable, use 0
- Preserve half marks as decimals (e.g., 2.5, not 3)
- Double-check your extraction before returning`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, pageIndex } = await req.json();
    
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image/PDF provided" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const actualMimeType = mimeType || 'image/png';
    const isImage = actualMimeType.startsWith('image/');
    const isPdf = actualMimeType === 'application/pdf';

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              ...(isPdf ? [{
                type: "file" as const,
                file: {
                  filename: "exam_sheet.pdf",
                  file_data: `data:application/pdf;base64,${imageBase64}`,
                },
              }] : [{
                type: "image_url" as const,
                image_url: {
                  url: `data:${actualMimeType};base64,${imageBase64}`,
                },
              }]),
              {
                type: "text",
                text: `Extract all marks and metadata from this exam sheet${pageIndex !== undefined ? ` (page ${pageIndex + 1})` : ''}. First detect the regulation type (A3 or R23), then carefully read EVERY digit in the marks table. Double-check each value before returning. Pay special attention to handwritten digits that may be ambiguous.`,
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_exam_data",
              description: "Extract structured exam sheet data",
              parameters: {
                type: "object",
                properties: {
                  regulation: {
                    type: "string",
                    enum: ["A3", "R23"],
                    description: "Detected regulation type",
                  },
                  questions: {
                    type: "array",
                    description: "For A3: array of question objects with a, b, c, total",
                    items: {
                      type: "object",
                      properties: {
                        q: { type: "number" },
                        a: { type: "number" },
                        b: { type: "number" },
                        c: { type: "number" },
                        total: { type: "number" },
                      },
                      required: ["q", "a", "b", "c", "total"],
                    },
                  },
                  partA: {
                    type: "array",
                    description: "For R23: Part A questions",
                    items: {
                      type: "object",
                      properties: {
                        q: { type: "number" },
                        marks: { type: "number" },
                      },
                      required: ["q", "marks"],
                    },
                  },
                  partB: {
                    type: "array",
                    description: "For R23: Part B questions with sub-parts",
                    items: {
                      type: "object",
                      properties: {
                        q: { type: "number" },
                        i: { type: "number" },
                        ii: { type: "number" },
                        iii: { type: "number" },
                      },
                      required: ["q", "i", "ii", "iii"],
                    },
                  },
                  writtenTotal: {
                    type: "number",
                    description: "Total marks written in figures",
                  },
                  bubbleTotal: {
                    type: "number",
                    description: "Total from OMR bubble digits",
                  },
                  marksInWords: {
                    type: "string",
                    description: "Marks written in words (tens + units)",
                  },
                  metadata: {
                    type: "object",
                    properties: {
                      examName: { type: "string" },
                      branch: { type: "string" },
                      subjectCode: { type: "string" },
                      subjectName: { type: "string" },
                      examinerName: { type: "string" },
                      scrutinizerName: { type: "string" },
                    },
                  },
                  bundleNumber: {
                    type: "string",
                    description: "Bundle number printed or handwritten on the sheet",
                  },
                  validationNumber: {
                    type: "string",
                    description: "Validation number printed or handwritten on the sheet",
                  },
                },
                required: ["regulation", "writtenTotal", "bubbleTotal"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_exam_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Failed to extract data from image" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error("OCR error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

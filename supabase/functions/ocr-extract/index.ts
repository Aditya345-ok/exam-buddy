import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are an expert OCR system that extracts marks from Indian university exam answer sheet cover pages.

You will receive an image of an exam sheet. Your job is to:
1. Detect the regulation type (A3 or R23)
2. Extract all question-wise marks
3. Extract totals and metadata

REGULATION DETECTION:
- If the sheet has columns "Q No | a | b | c | Total" → regulation = "A3"
- If the sheet has "PART A", "PART B" sections → regulation = "R23"

FOR A3 REGULATION sheets (like MVGR college sheets):
The sheet has a table with columns: Q No, a, b, c, Total
- Extract each question row with values for a, b, c, and total
- Questions are numbered 1-10
- Some questions may be empty/unanswered (use 0 for empty)
- "TOTAL MARKS (in figures)" is the written total
- There are OMR bubble circles for tens and units digit on the right side
- Extract "Marks in Words" tens place and units place
- Extract metadata: Exam name, Branch, SubCode, SubName, Examiner's Name, Scrutinizer's Name

FOR R23 REGULATION sheets:
- PART A has questions with single marks
- PART B has questions with sub-parts i, ii, iii
- Extract total marks for Part A and Part B
- Extract written total and bubble total

IMPORTANT: Use tool calling to return the structured data. For any marks that are crossed out, illegible, or have a dash/line through them, use 0.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();
    
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || 'image/png'};base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: "Extract all marks and metadata from this exam sheet image. Detect the regulation type first, then extract accordingly.",
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

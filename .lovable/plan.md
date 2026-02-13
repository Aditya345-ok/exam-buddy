

# OCR Exam Sheet Validator

## Overview
A web app that bulk-processes exam sheet images using AI (Gemini) to extract marks, detect regulation type (A3 vs R23), validate totals, and export results to Excel.

## Pages & Features

### 1. Upload Page (Home)
- Drag & drop zone for bulk image upload
- Folder upload support
- Image preview thumbnails in a grid
- "Process All" button to start OCR
- Progress bar showing processing status (e.g., "Processing 3 of 12...")

### 2. AI OCR Processing
- Uses Gemini AI (via Lovable AI gateway) to analyze each exam sheet image
- **Auto-detects regulation** from image content:
  - **A3**: Has "Q No | a | b | c | Total" column structure
  - **R23**: Has "PART A", "PART B" sections
- Extracts structured data: question-wise marks, written total, bubble total, metadata (exam name, branch, subject, examiner, scrutinizer)
- Processes images sequentially with progress indicator

### 3. Validation Engine
- **A3 regulation**: Calculates sum of all question totals (or a+b+c per question)
- **R23 regulation**: Calculates Part A total + Part B total (sum of i+ii+iii per question)
- Compares calculated total against written total and bubble total
- Status: ✅ PASSED (all match) or ❌ FAILED (with specific mismatch details)

### 4. Results Table
- Displays all processed sheets in a sortable table
- Columns: Image Name, Regulation, Question Marks, Calculated Total, Written Total, Bubble Total, Status (green/red badge), Remarks
- Click to expand row for full metadata details

### 5. Excel Export
- Confirmation dialog after all processing completes
- **Sheet 1**: Full results with all marks, totals, status, remarks
- **Sheet 2**: Summary — total processed, passed count, failed count

## Technical Approach
- Lovable Cloud + Lovable AI (Gemini) for OCR processing
- Edge function with carefully crafted prompt referencing the exam sheet formats from your uploaded images
- `xlsx` library for Excel generation
- Clean, modern UI with Tailwind CSS


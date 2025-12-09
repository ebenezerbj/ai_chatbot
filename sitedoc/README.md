# Financial Documents Directory

This directory (`sitedoc/`) is where all financial PDF documents should be stored.

## Setup Instructions

1. **Upload PDF Files**: Place your financial statement PDF files in this directory
2. **Database Records**: Ensure the `financials_tb` table has records with:
   - `title`: Document title
   - `year`: Financial year
   - `document`: Filename of the PDF (without the `sitedoc/` path)

## Example

If you have a file: `sitedoc/financial-statement-2024.pdf`

Database entry should have:
- `document` = `financial-statement-2024.pdf` (just the filename)

## File Permissions

Ensure this directory has appropriate read permissions:
- Linux/Mac: `chmod 755 sitedoc/`
- Files: `chmod 644 sitedoc/*.pdf`

## Security Notes

- Only PDF files can be accessed through the viewer
- Directory traversal attacks are prevented
- Files must be in this directory to be accessible

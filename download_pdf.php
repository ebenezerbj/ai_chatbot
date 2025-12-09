<?php
/**
 * PDF Downloader - Forces download of PDF files
 * Usage: download_pdf.php?file=sitedoc/filename.pdf
 */

// Security check - only allow files from sitedoc directory
if (!isset($_GET['file']) || empty($_GET['file'])) {
    http_response_code(400);
    die('Error: No file specified');
}

$file = $_GET['file'];

// Prevent directory traversal attacks
$file = str_replace(['../', '..\\', '\\'], '', $file);

// Ensure file is within sitedoc directory
if (strpos($file, 'sitedoc/') !== 0) {
    http_response_code(403);
    die('Error: Invalid file path. Only files in sitedoc/ directory are allowed.');
}

// Full path to file
$filePath = __DIR__ . '/' . $file;

// Check if file exists
if (!file_exists($filePath)) {
    http_response_code(404);
    die('Error: File not found at path: ' . htmlspecialchars($file) . '<br><br>Please ensure:<br>1. The file exists in the sitedoc/ directory<br>2. The filename in the database matches the actual file<br>3. File permissions are correct');
}

// Check if it's actually a PDF
$fileInfo = pathinfo($filePath);
if (strtolower($fileInfo['extension']) !== 'pdf') {
    http_response_code(400);
    die('Error: Invalid file type. Only PDF files are allowed.');
}

// Get file info for headers
$fileSize = filesize($filePath);
$fileName = basename($filePath);

// Set headers to force download
header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . $fileName . '"');
header('Content-Length: ' . $fileSize);
header('Accept-Ranges: bytes');
header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
header('Pragma: public');
header('Expires: 0');

// Disable output buffering
if (ob_get_level()) {
    ob_end_clean();
}

// Output the file
readfile($filePath);
exit;
?>

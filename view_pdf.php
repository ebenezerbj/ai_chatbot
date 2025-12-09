<?php
/**
 * PDF Viewer - Opens PDF in browser with download option
 * Usage: view_pdf.php?file=sitedoc/filename.pdf
 */

// Security check - only allow files from sitedoc directory
if (!isset($_GET['file']) || empty($_GET['file'])) {
    die('No file specified');
}

$file = $_GET['file'];

// Prevent directory traversal attacks
$file = str_replace(['../', '..\\', '\\'], '', $file);

// Ensure file is within sitedoc directory
if (strpos($file, 'sitedoc/') !== 0) {
    die('Invalid file path');
}

// Full path to file
$filePath = __DIR__ . '/' . $file;

// Check if file exists
if (!file_exists($filePath)) {
    die('File not found: ' . htmlspecialchars($file));
}

// Check if it's actually a PDF
$fileInfo = pathinfo($filePath);
if (strtolower($fileInfo['extension']) !== 'pdf') {
    die('Invalid file type. Only PDF files are allowed.');
}

// Get file info for headers
$fileSize = filesize($filePath);
$fileName = basename($filePath);

// Set headers to display PDF in browser
header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="' . $fileName . '"');
header('Content-Length: ' . $fileSize);
header('Accept-Ranges: bytes');
header('Cache-Control: public, must-revalidate, max-age=0');
header('Pragma: public');
header('Expires: 0');
header('X-Content-Type-Options: nosniff');

// Disable output buffering
if (ob_get_level()) {
    ob_end_clean();
}

// Output the file
readfile($filePath);
exit;
?>

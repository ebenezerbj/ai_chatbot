<?php
/**
 * PDF Downloader - Forces download of PDF files
 * Usage: download_pdf.php?file=filename.pdf
 */

// Security check
if (!isset($_GET['file']) || empty($_GET['file'])) {
    http_response_code(400);
    die('Error: No file specified');
}

$file = $_GET['file'];

// Prevent directory traversal attacks
$file = str_replace(['../', '..\\', '\\'], '', $file);
$file = basename($file); // Get only the filename, no path

// Define the document directory path (adjust this to match your server structure)
// Common paths: 'sitedoc/', '../sitedoc/', '/var/www/html/sitedoc/', etc.
$docDirectory = 'sitedoc/';

// Full path to file
$filePath = __DIR__ . '/' . $docDirectory . $file;

// Check if file exists
if (!file_exists($filePath)) {
    http_response_code(404);
    echo '<!DOCTYPE html>
<html>
<head>
    <title>File Not Found</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
        .error-box { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
        h1 { color: #dc3545; margin-top: 0; }
        .info { background: #f8f9fa; padding: 15px; border-left: 4px solid #0F4C81; margin: 20px 0; }
        code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="error-box">
        <h1>📄 File Not Found</h1>
        <p><strong>Requested file:</strong> <code>' . htmlspecialchars($file) . '</code></p>
        <p><strong>Looking in:</strong> <code>' . htmlspecialchars($docDirectory) . '</code></p>
        <div class="info">
            <strong>Please check:</strong>
            <ol>
                <li>The file exists in the <code>' . htmlspecialchars($docDirectory) . '</code> directory</li>
                <li>The filename in the database matches exactly (case-sensitive)</li>
                <li>File permissions are correct (readable by web server)</li>
                <li>The path in <code>download_pdf.php</code> matches your server structure</li>
            </ol>
        </div>
        <p><a href="javascript:history.back()" style="color: #0F4C81;">&larr; Go Back</a></p>
    </div>
</body>
</html>';
    exit;
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

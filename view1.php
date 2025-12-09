<?php
/**
 * View PDF in browser - compatible with existing code pattern
 * Usage: view1.php?path=sitedoc/filename.pdf
 */

// Security check
if (!isset($_GET['path']) || empty($_GET['path'])) {
    http_response_code(400);
    die('Error: No file path specified');
}

$path = $_GET['path'];

// Prevent directory traversal attacks
$path = str_replace(['../', '..\\'], '', $path);

// Ensure path starts with sitedoc/
if (strpos($path, 'sitedoc/') !== 0) {
    http_response_code(403);
    die('Error: Invalid path. Only sitedoc/ directory is accessible.');
}

// Full path to file
$filePath = __DIR__ . '/' . $path;

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
        <p><strong>Requested path:</strong> <code>' . htmlspecialchars($path) . '</code></p>
        <p><strong>Full path:</strong> <code>' . htmlspecialchars($filePath) . '</code></p>
        <div class="info">
            <strong>Troubleshooting:</strong>
            <ol>
                <li>Verify the file exists in the <code>sitedoc/</code> directory on your server</li>
                <li>Check that the filename in database matches exactly (case-sensitive)</li>
                <li>Ensure file permissions allow web server to read the file</li>
                <li>The database <code>document</code> column should contain just the filename (e.g., "report-2024.pdf")</li>
                <li>The code automatically adds "sitedoc/" prefix</li>
            </ol>
        </div>
        <p><a href="javascript:history.back()" style="color: #0F4C81; text-decoration: none;">&larr; Go Back</a></p>
    </div>
</body>
</html>';
    exit;
}

// Check if it's a PDF
$fileInfo = pathinfo($filePath);
if (strtolower($fileInfo['extension']) !== 'pdf') {
    http_response_code(400);
    die('Error: Only PDF files can be viewed.');
}

// Get file info
$fileSize = filesize($filePath);
$fileName = basename($filePath);

// Set headers to display in browser
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

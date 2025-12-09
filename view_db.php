<?php
/**
 * PDF Viewer - Handles both file-based and database blob PDFs
 * Usage: view_db.php?id=123 (for database) OR view_db.php?path=sitedoc/file.pdf (for files)
 */

// Check what type of request this is
$useDatabase = isset($_GET['id']) && !empty($_GET['id']);
$useFile = isset($_GET['path']) && !empty($_GET['path']);

if (!$useDatabase && !$useFile) {
    http_response_code(400);
    die('Error: Specify either id (for database) or path (for file)');
}

// Handle database blob
if ($useDatabase) {
    $id = intval($_GET['id']);
    
    try {
        // Include database connection
        if (!file_exists(__DIR__ . '/sitedata/connect.php')) {
            die('Error: Database connection file not found');
        }
        
        include __DIR__ . '/sitedata/connect.php';
        
        if (!isset($db)) {
            die('Error: Database connection failed');
        }
        
        // Check if document field contains blob or filename
        $stmt = $db->prepare("SELECT document, title FROM financials_tb WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$row) {
            http_response_code(404);
            die('Error: Document not found in database');
        }
        
        $document = $row['document'];
        $title = $row['title'];
        
        // Check if document is a blob (binary data) or a filename
        if (strlen($document) > 500) {
            // Likely a blob
            $fileName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $title) . '.pdf';
            
            header('Content-Type: application/pdf');
            header('Content-Disposition: inline; filename="' . $fileName . '"');
            header('Content-Length: ' . strlen($document));
            header('Accept-Ranges: bytes');
            header('Cache-Control: public, must-revalidate, max-age=0');
            header('Pragma: public');
            header('X-Content-Type-Options: nosniff');
            
            if (ob_get_level()) ob_end_clean();
            
            echo $document;
            exit;
        } else {
            // It's a filename, redirect to file-based viewer
            $filePath = 'sitedoc/' . $document;
            header('Location: view1.php?path=' . urlencode($filePath));
            exit;
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        die('Error: ' . htmlspecialchars($e->getMessage()));
    }
}

// Handle file-based (same as view1.php)
if ($useFile) {
    $path = $_GET['path'];
    $path = str_replace(['../', '..\\'], '', $path);
    
    if (strpos($path, 'sitedoc/') !== 0) {
        http_response_code(403);
        die('Error: Invalid path');
    }
    
    $filePath = __DIR__ . '/' . $path;
    
    if (!file_exists($filePath)) {
        http_response_code(404);
        die('Error: File not found at ' . htmlspecialchars($path));
    }
    
    $fileInfo = pathinfo($filePath);
    if (strtolower($fileInfo['extension']) !== 'pdf') {
        http_response_code(400);
        die('Error: Only PDF files allowed');
    }
    
    $fileSize = filesize($filePath);
    $fileName = basename($filePath);
    
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $fileName . '"');
    header('Content-Length: ' . $fileSize);
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, must-revalidate, max-age=0');
    header('Pragma: public');
    header('X-Content-Type-Options: nosniff');
    
    if (ob_get_level()) ob_end_clean();
    
    readfile($filePath);
    exit;
}
?>

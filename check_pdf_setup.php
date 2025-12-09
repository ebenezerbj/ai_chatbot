<?php
/**
 * Diagnostic Tool - Check PDF File Setup
 * Access this file directly in your browser to see what's wrong
 */
?>
<!DOCTYPE html>
<html>
<head>
    <title>PDF Setup Diagnostic</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #0F4C81; }
        .section { margin: 20px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #0F4C81; }
        .success { color: #10b981; font-weight: bold; }
        .error { color: #dc3545; font-weight: bold; }
        .warning { color: #f59e0b; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        table th, table td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        table th { background: #0F4C81; color: white; }
        code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
        .info-box { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 PDF Setup Diagnostic Tool</h1>
        <p>This tool checks your PDF file setup and helps identify issues.</p>

        <?php
        // 1. Check current directory
        echo '<div class="section">';
        echo '<h2>1️⃣ Current Directory</h2>';
        echo '<p><strong>Script location:</strong> <code>' . __DIR__ . '</code></p>';
        echo '</div>';

        // 2. Check if sitedoc directory exists
        echo '<div class="section">';
        echo '<h2>2️⃣ Sitedoc Directory Check</h2>';
        $sitedocPath = __DIR__ . '/sitedoc/';
        
        if (file_exists($sitedocPath)) {
            echo '<p class="success">✓ Directory exists: <code>' . $sitedocPath . '</code></p>';
            
            // Check if directory is readable
            if (is_readable($sitedocPath)) {
                echo '<p class="success">✓ Directory is readable</p>';
            } else {
                echo '<p class="error">✗ Directory is NOT readable (permission issue)</p>';
                echo '<p>Fix: <code>chmod 755 sitedoc/</code></p>';
            }
            
            // List all files in sitedoc
            echo '<h3>Files in sitedoc/:</h3>';
            $files = scandir($sitedocPath);
            $pdfFiles = array_filter($files, function($file) use ($sitedocPath) {
                return is_file($sitedocPath . $file) && pathinfo($file, PATHINFO_EXTENSION) === 'pdf';
            });
            
            if (count($pdfFiles) > 0) {
                echo '<table>';
                echo '<tr><th>Filename</th><th>Size</th><th>Readable</th><th>Full Path</th></tr>';
                foreach ($pdfFiles as $file) {
                    $fullPath = $sitedocPath . $file;
                    $size = filesize($fullPath);
                    $readable = is_readable($fullPath) ? '<span class="success">Yes</span>' : '<span class="error">No</span>';
                    echo '<tr>';
                    echo '<td><code>' . htmlspecialchars($file) . '</code></td>';
                    echo '<td>' . number_format($size / 1024, 2) . ' KB</td>';
                    echo '<td>' . $readable . '</td>';
                    echo '<td><code>' . htmlspecialchars($fullPath) . '</code></td>';
                    echo '</tr>';
                }
                echo '</table>';
            } else {
                echo '<p class="warning">⚠ No PDF files found in sitedoc/ directory</p>';
                echo '<div class="info-box">';
                echo '<strong>Action Required:</strong> Upload your PDF files to the <code>sitedoc/</code> directory';
                echo '</div>';
            }
        } else {
            echo '<p class="error">✗ Directory does NOT exist: <code>' . $sitedocPath . '</code></p>';
            echo '<div class="info-box">';
            echo '<strong>Action Required:</strong> Create the sitedoc directory:<br>';
            echo '<code>mkdir sitedoc</code><br>';
            echo '<code>chmod 755 sitedoc</code>';
            echo '</div>';
        }
        echo '</div>';

        // 3. Check database connection and records
        echo '<div class="section">';
        echo '<h2>3️⃣ Database Check</h2>';
        
        try {
            if (file_exists(__DIR__ . '/sitedata/connect.php')) {
                include_once __DIR__ . '/sitedata/connect.php';
                
                if (isset($db)) {
                    echo '<p class="success">✓ Database connected</p>';
                    
                    // Check if table exists and show structure
                    try {
                        $stmt = $db->query("DESCRIBE financials_tb");
                        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
                        
                        echo '<h3>Table Structure (financials_tb):</h3>';
                        echo '<table>';
                        echo '<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Extra</th></tr>';
                        foreach ($columns as $col) {
                            echo '<tr>';
                            echo '<td><code>' . htmlspecialchars($col['Field']) . '</code></td>';
                            echo '<td>' . htmlspecialchars($col['Type']) . '</td>';
                            echo '<td>' . htmlspecialchars($col['Null']) . '</td>';
                            echo '<td>' . htmlspecialchars($col['Key']) . '</td>';
                            echo '<td>' . htmlspecialchars($col['Extra']) . '</td>';
                            echo '</tr>';
                        }
                        echo '</table>';
                    } catch (Exception $e) {
                        echo '<p class="error">✗ Cannot access table structure: ' . htmlspecialchars($e->getMessage()) . '</p>';
                    }
                    
                    // Get records from financials_tb
                    try {
                        $stmt = $db->prepare("SELECT * FROM financials_tb ORDER BY id DESC LIMIT 10");
                        $stmt->execute();
                        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
                        
                        if (count($records) > 0) {
                            echo '<p class="success">✓ Found ' . count($records) . ' records in database</p>';
                            echo '<h3>Database Records Analysis:</h3>';
                            echo '<table>';
                            echo '<tr><th>ID</th><th>Title</th><th>Year</th><th>Document Field</th><th>Document Type</th><th>File Exists?</th></tr>';
                            
                            foreach ($records as $row) {
                                $docField = $row['document'];
                                
                                // Check if it might be a path, filename, or blob
                                $docType = 'Unknown';
                                $fileExists = '<span class="warning">N/A</span>';
                                
                                if (is_null($docField)) {
                                    $docType = 'NULL';
                                } elseif (empty($docField)) {
                                    $docType = 'Empty String';
                                } elseif (preg_match('/^[a-zA-Z0-9._-]+\.pdf$/i', $docField)) {
                                    $docType = 'Filename';
                                    $filePath = $sitedocPath . $docField;
                                    $fileExists = file_exists($filePath) ? '<span class="success">✓ Yes</span>' : '<span class="error">✗ No</span>';
                                } elseif (preg_match('/[\\/\\\\]/', $docField)) {
                                    $docType = 'Path';
                                    $filePath = __DIR__ . '/' . $docField;
                                    $fileExists = file_exists($filePath) ? '<span class="success">✓ Yes</span>' : '<span class="error">✗ No</span>';
                                } elseif (strlen($docField) > 1000) {
                                    $docType = 'Binary Data (' . number_format(strlen($docField) / 1024, 2) . ' KB)';
                                } else {
                                    $docType = 'String (' . strlen($docField) . ' chars)';
                                }
                                
                                echo '<tr>';
                                echo '<td>' . $row['id'] . '</td>';
                                echo '<td>' . htmlspecialchars(substr($row['title'], 0, 30)) . '</td>';
                                echo '<td>' . htmlspecialchars($row['year']) . '</td>';
                                echo '<td><code>' . htmlspecialchars(substr($docField, 0, 50)) . (strlen($docField) > 50 ? '...' : '') . '</code></td>';
                                echo '<td>' . $docType . '</td>';
                                echo '<td>' . $fileExists . '</td>';
                                echo '</tr>';
                            }
                            echo '</table>';
                            
                            // Show sample document field value
                            if (count($records) > 0) {
                                $sample = $records[0]['document'];
                                echo '<div class="info-box">';
                                echo '<strong>Sample document field value:</strong><br>';
                                echo '<code>' . htmlspecialchars($sample) . '</code><br>';
                                echo '<strong>Length:</strong> ' . strlen($sample) . ' characters';
                                echo '</div>';
                            }
                        } else {
                            echo '<p class="warning">⚠ No records found in financials_tb table</p>';
                        }
                    } catch (Exception $e) {
                        echo '<p class="error">✗ Cannot query table: ' . htmlspecialchars($e->getMessage()) . '</p>';
                    }
                } else {
                    echo '<p class="error">✗ Database connection failed</p>';
                }
            } else {
                echo '<p class="warning">⚠ sitedata/connect.php not found (normal if testing locally)</p>';
                echo '<p>This diagnostic script needs to be on your actual website server where the database exists.</p>';
            }
        } catch (Exception $e) {
            echo '<p class="error">✗ Database error: ' . htmlspecialchars($e->getMessage()) . '</p>';
        }
        echo '</div>';

        // 4. Test file access
        echo '<div class="section">';
        echo '<h2>4️⃣ File Access Test</h2>';
        if (isset($pdfFiles) && count($pdfFiles) > 0) {
            $testFile = reset($pdfFiles);
            $testPath = 'sitedoc/' . $testFile;
            echo '<p>Testing access to: <code>' . htmlspecialchars($testFile) . '</code></p>';
            echo '<p><a href="view1.php?path=' . urlencode($testPath) . '" target="_blank" class="success">🔗 Test View in Browser</a></p>';
            echo '<p><a href="download1.php?path=' . urlencode($testPath) . '" class="success">🔗 Test Download</a></p>';
        } else {
            echo '<p class="warning">No files available to test</p>';
        }
        echo '</div>';

        // 5. Recommendations
        echo '<div class="section">';
        echo '<h2>5️⃣ Setup Instructions</h2>';
        echo '<ol>';
        echo '<li>Create <code>sitedoc/</code> directory if it doesn\'t exist</li>';
        echo '<li>Upload your PDF files to <code>sitedoc/</code> directory</li>';
        echo '<li>Set permissions: <code>chmod 755 sitedoc/</code> and <code>chmod 644 sitedoc/*.pdf</code></li>';
        echo '<li>Ensure database <code>document</code> column contains just filenames (not paths)</li>';
        echo '<li>Filename examples: <code>financial-2024.pdf</code>, <code>report-2023.pdf</code></li>';
        echo '</ol>';
        echo '</div>';
        ?>
    </div>
</body>
</html>

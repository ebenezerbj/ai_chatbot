<?php
// SMS Service for AKCBANK Credit Application System

function sendSMSOnlineGH($message, $destinationNumbers) {
    // !!! CRITICAL SECURITY WARNING !!!
    // This API key should be loaded from a secure source (e.g., environment variables,
    // a configuration file outside the web root) and NOT hardcoded in production.
    // For demonstration purposes only:
    $apiKey = 'aefc1848ebc7baaa90e71bfb6072287cc2cc197882e73631a1bdc27135a51abb'; // Example key from documentation

    $headers = [
        'Content-Type: application/json',
        'Accept: application/json',
        'Authorization: key ' . $apiKey
    ];

    $messageData = [
        'text' => $message,
        'type' => 0, // GSM default
        'sender' => 'AKCBANK LTD', // Ensure this sender ID is registered in your SMSOnlineGH account
        'destinations' => $destinationNumbers // This must be an array of strings like ['233XXXXXXXXX']
    ];

    // Corrected endpoint URL as per documentation: added '/message/'
    $ch = curl_init('https://api.smsonlinegh.com/v5/message/sms/send');

    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($messageData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    // --- SSL Verification Setup (CRITICAL FOR PRODUCTION) ---
    // Ensure 'cacert.pem' is in the correct path relative to this script,
    // or provide an absolute path.
    // Download the latest cacert.pem from https://curl.se/docs/caextract.html
    $caCertPath = __DIR__ . "/cacert.pem";
    if (file_exists($caCertPath)) {
        curl_setopt($ch, CURLOPT_CAINFO, $caCertPath);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true); // Enable peer verification
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);    // Verify hostname against certificate
    } else {
        // WARNING: Disabling SSL verification is insecure. Only for development!
        error_log("CA certificate file not found at: $caCertPath. Disabling SSL verification (NOT RECOMMENDED FOR PRODUCTION!).");
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
    }
    // --- END SSL Verification Setup ---

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        error_log("cURL error sending SMS: " . curl_error($ch));
        curl_close($ch);
        return false; // cURL error occurred
    }

    curl_close($ch);

    // Log the full response for debugging
    error_log("SMS API Raw Response: HTTP Code $httpCode, Body: $response");

    $responseData = json_decode($response, true);

    // Check HTTP status code AND API's internal handshake status for success
    $success = false;
    if ($httpCode == 200 && isset($responseData['handshake']) &&
        $responseData['handshake']['id'] === 0 && $responseData['handshake']['label'] === 'HSHK_OK') {
        $success = true;
        // Log individual destination statuses if the request was accepted by the API
        if (isset($responseData['data']['destinations'])) {
            foreach ($responseData['data']['destinations'] as $destination) {
                $to = $destination['to'] ?? 'Unknown';
                $status = $destination['status']['label'] ?? 'Unknown';
                $statusId = $destination['status']['id'] ?? 'Unknown';
                $messageId = $destination['id'] ?? 'Unknown';
                error_log("SMS to $to: Status - $status (ID: $statusId), Message ID: $messageId");
            }
        }
    } else {
        // Log detailed error from API response if available
        $errorMsg = "SMS API Request Failed. HTTP Code: $httpCode. ";
        if (isset($responseData['handshake'])) {
            $errorMsg .= "Handshake ID: {$responseData['handshake']['id']}, Label: {$responseData['handshake']['label']}. ";
        }
        // Check for other potential error messages in the response structure
        if (isset($responseData['data']['message'])) {
            $errorMsg .= "API Message: {$responseData['data']['message']}.";
        } elseif (isset($responseData['message'])) { // Some APIs use a top-level 'message' for errors
            $errorMsg .= "API Message: {$responseData['message']}.";
        }
        error_log($errorMsg);
    }

    return $success;
}

// Logging function for SMS operations
function logSMSOperation($line) {
    $dir = __DIR__ . '/logs';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    $file = $dir . '/sms.log';
    @file_put_contents($file, '['.date('Y-m-d H:i:s').'] '.$line.PHP_EOL, FILE_APPEND|LOCK_EX);
}

// Alias for compatibility with legacy or external code
function sms_send($message, $destinationNumbers, $sender = 'AKCBANK LTD') {
    return sendSMSOnlineGH($message, $destinationNumbers);
}
?>


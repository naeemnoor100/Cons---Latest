<?php
/**
 * BuildTrack Pro - MySQL API Bridge
 * Place this file in your server's root folder (e.g., public_html).
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// --- DATABASE CONFIGURATION ---
// Replace with your hosting credentials
$db_host = 'localhost';
$db_name = 'your_database_name';
$db_user = 'your_database_user';
$db_pass = 'your_database_password';

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    die(json_encode(["error" => "Database Connection Failed"]));
}

$action = $_GET['action'] ?? '';

// ACTION: SYNC (Fetch data from MySQL)
if ($action === 'sync') {
    $syncId = $_GET['syncId'] ?? '';
    if (empty($syncId)) {
        echo json_encode(["error" => "Sync ID required"]);
        exit;
    }

    $stmt = $conn->prepare("SELECT state_json FROM sync_sessions WHERE sync_id = ?");
    $stmt->bind_param("s", $syncId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        echo $row['state_json'];
    } else {
        echo json_encode(["status" => "new", "message" => "Initialized new cloud session"]);
    }
    $stmt->close();
} 

// ACTION: SAVE_STATE (Commit changes to MySQL)
elseif ($action === 'save_state') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data || !isset($data['syncId'])) {
        echo json_encode(["error" => "Invalid payload"]);
        exit;
    }

    $syncId = $data['syncId'];
    $ts = round(microtime(true) * 1000);

    // Using REPLACE INTO for atomic update/insert
    $stmt = $conn->prepare("REPLACE INTO sync_sessions (sync_id, state_json, last_updated) VALUES (?, ?, ?)");
    $stmt->bind_param("ssi", $syncId, $input, $ts);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "timestamp" => $ts]);
    } else {
        echo json_encode(["error" => $stmt->error]);
    }
    $stmt->close();
}

$conn->close();
?>
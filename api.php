<?php
/**
 * BuildTrack Pro - Professional Relational MySQL API Bridge
 * ERROR FIX: Ensures only valid JSON is outputted to prevent "Unexpected non-whitespace character" errors.
 */

// 1. Setup error handling to not interfere with JSON output
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// --- DATABASE CONFIGURATION ---
// IMPORTANT: User must set these correctly
$db_host = 'localhost';
$db_name = 'your_database_name';
$db_user = 'your_database_user';
$db_pass = 'your_database_password';

// 2. Suppressed connection for clean output
$conn = @new mysqli($db_host, $db_user, $db_pass);

if ($conn->connect_error) {
    echo json_encode(["error" => "Database Connection Failed: " . $conn->connect_error]);
    exit;
}

// Ensure database exists
@$conn->query("CREATE DATABASE IF NOT EXISTS $db_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$conn->select_db($db_name);

/**
 * AUTO-BOOTSTRAP SCHEMA
 * Whenever you add a new module, add its SQL here.
 */
function runSchemaSetup($conn) {
    $tables = [
        "projects" => "CREATE TABLE IF NOT EXISTS projects (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), name VARCHAR(255) NOT NULL,
            client VARCHAR(255), location TEXT, startDate DATE, endDate DATE,
            budget DECIMAL(15,2), status VARCHAR(50), description TEXT,
            contactNumber VARCHAR(50), isGodown BOOLEAN DEFAULT FALSE, INDEX (sync_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "vendors" => "CREATE TABLE IF NOT EXISTS vendors (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), name VARCHAR(255) NOT NULL,
            phone VARCHAR(50), address TEXT, category VARCHAR(100),
            balance DECIMAL(15,2) DEFAULT 0, INDEX (sync_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "materials" => "CREATE TABLE IF NOT EXISTS materials (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), name VARCHAR(255) NOT NULL,
            unit VARCHAR(50), costPerUnit DECIMAL(15,2), totalPurchased DECIMAL(15,3),
            totalUsed DECIMAL(15,3), INDEX (sync_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "expenses" => "CREATE TABLE IF NOT EXISTS expenses (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), date DATE, projectId VARCHAR(50),
            vendorId VARCHAR(50), materialId VARCHAR(50), materialQuantity DECIMAL(15,3),
            amount DECIMAL(15,2), paymentMethod VARCHAR(50), category VARCHAR(100),
            notes TEXT, inventoryAction VARCHAR(50), parentPurchaseId VARCHAR(50),
            INDEX (sync_id), INDEX (projectId), INDEX (vendorId)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "incomes" => "CREATE TABLE IF NOT EXISTS incomes (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), projectId VARCHAR(50),
            date DATE, amount DECIMAL(15,2), description TEXT, method VARCHAR(50),
            invoiceId VARCHAR(50), INDEX (sync_id), INDEX (projectId)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "invoices" => "CREATE TABLE IF NOT EXISTS invoices (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), projectId VARCHAR(50),
            date DATE, dueDate DATE, amount DECIMAL(15,2), description TEXT,
            status VARCHAR(50), INDEX (sync_id), INDEX (projectId)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "payments" => "CREATE TABLE IF NOT EXISTS payments (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), date DATE,
            vendorId VARCHAR(50), projectId VARCHAR(50), amount DECIMAL(15,2),
            method VARCHAR(50), reference TEXT, materialBatchId VARCHAR(50),
            INDEX (sync_id), INDEX (vendorId)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "workers" => "CREATE TABLE IF NOT EXISTS workers (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), name VARCHAR(255) NOT NULL,
            phone VARCHAR(50), trade VARCHAR(100), dailyWage DECIMAL(15,2),
            activeProjectId VARCHAR(50), INDEX (sync_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "attendance" => "CREATE TABLE IF NOT EXISTS attendance (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), workerId VARCHAR(50),
            projectId VARCHAR(50), date DATE, status VARCHAR(20),
            wageEarned DECIMAL(15,2), isPaid BOOLEAN, paymentId VARCHAR(50),
            INDEX (sync_id), INDEX (workerId), INDEX (projectId)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "sync_sessions" => "CREATE TABLE IF NOT EXISTS sync_sessions (
            sync_id VARCHAR(50) PRIMARY KEY, state_json LONGTEXT, last_updated BIGINT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    ];

    foreach ($tables as $sql) {
        $conn->query($sql);
    }
}

$action = $_GET['action'] ?? '';

// ALWAYS check schema on every request if needed, but for performance, we handle it via explicit actions or on sync
if ($action === 'initialize_db') {
    runSchemaSetup($conn);
    echo json_encode(["success" => true, "message" => "Database schema verified and updated."]);
    exit;
}

if ($action === 'sync') {
    $syncId = $_GET['syncId'] ?? '';
    if (!$syncId) {
        echo json_encode(["error" => "No syncId"]);
        exit;
    }
    $stmt = $conn->prepare("SELECT state_json FROM sync_sessions WHERE sync_id = ?");
    $stmt->bind_param("s", $syncId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        echo $row['state_json'];
    } else {
        echo json_encode(["status" => "new"]);
    }
    $stmt->close();
} 

elseif ($action === 'save_state') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    if (!$data || !isset($data['syncId'])) {
        echo json_encode(["error" => "Invalid payload"]);
        exit;
    }
    $syncId = $data['syncId'];
    $ts = round(microtime(true) * 1000);
    $stmt = $conn->prepare("REPLACE INTO sync_sessions (sync_id, state_json, last_updated) VALUES (?, ?, ?)");
    $stmt->bind_param("ssi", $syncId, $input, $ts);
    if ($stmt->execute()) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => $stmt->error]);
    }
    $stmt->close();
}

$conn->close();
exit;
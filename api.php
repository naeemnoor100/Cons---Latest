<?php
/**
 * BuildMaster Pro - Professional Relational MySQL API Bridge
 */

error_reporting(E_ALL);
ini_set('display_errors', 0); 

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// --- DATABASE CONFIGURATION ---
$db_host = 'localhost';
$db_name = 'your_database_name';
$db_user = 'your_database_user';
$db_pass = 'your_database_password';

$conn = @new mysqli($db_host, $db_user, $db_pass);

if ($conn->connect_error) {
    echo json_encode([
        "success" => false, 
        "error" => "Database Connection Failed: " . $conn->connect_error,
        "hint" => "Please update database credentials in api.php"
    ]);
    exit;
}

@$conn->query("CREATE DATABASE IF NOT EXISTS $db_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$conn->select_db($db_name);

function ensureSchema($conn) {
    $conn->query("CREATE TABLE IF NOT EXISTS sync_sessions (
        sync_id VARCHAR(50) PRIMARY KEY, state_json LONGTEXT, last_updated BIGINT
    ) ENGINE=InnoDB");

    $tables = [
        "projects" => "CREATE TABLE IF NOT EXISTS projects (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), name VARCHAR(255),
            client VARCHAR(255), location TEXT, startDate DATE, endDate DATE,
            budget DECIMAL(15,2), status VARCHAR(50), description TEXT,
            contactNumber VARCHAR(50), isGodown BOOLEAN DEFAULT FALSE, INDEX (sync_id)
        ) ENGINE=InnoDB",
        "vendors" => "CREATE TABLE IF NOT EXISTS vendors (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), name VARCHAR(255),
            phone VARCHAR(50), address TEXT, category VARCHAR(100),
            balance DECIMAL(15,2) DEFAULT 0, INDEX (sync_id)
        ) ENGINE=InnoDB",
        "materials" => "CREATE TABLE IF NOT EXISTS materials (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), name VARCHAR(255),
            unit VARCHAR(50), costPerUnit DECIMAL(15,2), totalPurchased DECIMAL(15,3),
            totalUsed DECIMAL(15,3), INDEX (sync_id)
        ) ENGINE=InnoDB",
        "expenses" => "CREATE TABLE IF NOT EXISTS expenses (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), date DATE, projectId VARCHAR(50),
            vendorId VARCHAR(50), materialId VARCHAR(50), materialQuantity DECIMAL(15,3),
            amount DECIMAL(15,2), paymentMethod VARCHAR(50), category VARCHAR(100),
            notes TEXT, inventoryAction VARCHAR(50), parentPurchaseId VARCHAR(50),
            INDEX (sync_id)
        ) ENGINE=InnoDB",
        "incomes" => "CREATE TABLE IF NOT EXISTS incomes (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), projectId VARCHAR(50),
            date DATE, amount DECIMAL(15,2), description TEXT, method VARCHAR(50),
            invoiceId VARCHAR(50), INDEX (sync_id)
        ) ENGINE=InnoDB",
        "invoices" => "CREATE TABLE IF NOT EXISTS invoices (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), projectId VARCHAR(50),
            date DATE, dueDate DATE, amount DECIMAL(15,2), description TEXT,
            status VARCHAR(50), INDEX (sync_id)
        ) ENGINE=InnoDB",
        "payments" => "CREATE TABLE IF NOT EXISTS payments (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), date DATE,
            vendorId VARCHAR(50), projectId VARCHAR(50), amount DECIMAL(15,2),
            method VARCHAR(50), reference TEXT, materialBatchId VARCHAR(50),
            INDEX (sync_id)
        ) ENGINE=InnoDB",
        "workers" => "CREATE TABLE IF NOT EXISTS workers (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), name VARCHAR(255),
            phone VARCHAR(50), trade VARCHAR(100), dailyWage DECIMAL(15,2),
            activeProjectId VARCHAR(50), INDEX (sync_id)
        ) ENGINE=InnoDB",
        "attendance" => "CREATE TABLE IF NOT EXISTS attendance (
            id VARCHAR(50) PRIMARY KEY, sync_id VARCHAR(50), workerId VARCHAR(50),
            projectId VARCHAR(50), date DATE, status VARCHAR(20),
            wageEarned DECIMAL(15,2), isPaid BOOLEAN, paymentId VARCHAR(50),
            INDEX (sync_id)
        ) ENGINE=InnoDB"
    ];
    foreach ($tables as $sql) { $conn->query($sql); }
}

$action = $_GET['action'] ?? '';

if ($action === 'test_connection') {
    echo json_encode(["success" => true, "message" => "Bridge Reachable", "db" => $db_name]);
    exit;
}

// Automatically ensure schema on any main action
if ($action === 'sync' || $action === 'save_state' || $action === 'initialize_db') {
    ensureSchema($conn);
}

if ($action === 'initialize_db') {
    echo json_encode(["success" => true, "message" => "Database schema verified."]);
    exit;
}

if ($action === 'sync') {
    $syncId = $_GET['syncId'] ?? '';
    if (!$syncId) { echo json_encode(["error" => "No syncId"]); exit; }
    
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
    $stmt->execute();
    $stmt->close();

    $sync_tables = [
        'projects' => 'projects', 'vendors' => 'vendors', 'materials' => 'materials',
        'expenses' => 'expenses', 'incomes' => 'incomes', 'invoices' => 'invoices',
        'payments' => 'payments', 'workers' => 'workers', 'attendance' => 'attendance'
    ];

    foreach ($sync_tables as $apiKey => $tableName) {
        if (isset($data[$apiKey]) && is_array($data[$apiKey])) {
            $conn->query("DELETE FROM $tableName WHERE sync_id = '$syncId'");
            foreach ($data[$apiKey] as $item) {
                $fields = []; $values = [];
                $item['sync_id'] = $syncId;
                foreach ($item as $k => $v) {
                    if ($k === 'history') continue;
                    $fields[] = "`$k`";
                    if ($v === null) { $values[] = "NULL"; }
                    elseif (is_bool($v)) { $values[] = $v ? 1 : 0; }
                    else { $values[] = "'" . $conn->real_escape_string($v) . "'"; }
                }
                $sql = "INSERT INTO $tableName (" . implode(',', $fields) . ") VALUES (" . implode(',', $values) . ")";
                $conn->query($sql);
            }
        }
    }
    echo json_encode(["success" => true]);
}

$conn->close();
exit;
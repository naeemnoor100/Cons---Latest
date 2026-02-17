<?php
/**
 * BuildTrack Pro - Relational MySQL API Bridge
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// --- DATABASE CONFIGURATION ---
$db_host = 'localhost';
$db_name = 'your_database_name';
$db_user = 'your_database_user';
$db_pass = 'your_database_password';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
if ($conn->connect_error) {
    die(json_encode(["error" => "Database Connection Failed"]));
}

$action = $_GET['action'] ?? '';

// ACTION: SYNC (Fetch full state from master session)
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
        echo json_encode(["status" => "new", "message" => "Initialized new relational session"]);
    }
    $stmt->close();
} 

// ACTION: SAVE_STATE (Commit changes to Relational Tables)
elseif ($action === 'save_state') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data || !isset($data['syncId'])) {
        echo json_encode(["error" => "Invalid payload"]);
        exit;
    }

    $syncId = $data['syncId'];
    $ts = round(microtime(true) * 1000);

    // Start Transaction for atomic update across all tables
    $conn->begin_transaction();

    try {
        // 1. Update master sync session
        $stmt = $conn->prepare("REPLACE INTO sync_sessions (sync_id, state_json, last_updated) VALUES (?, ?, ?)");
        $stmt->bind_param("ssi", $syncId, $input, $ts);
        $stmt->execute();

        // 2. Clean and Map Projects
        $conn->query("DELETE FROM projects WHERE sync_id = '$syncId'");
        if (!empty($data['projects'])) {
            $stmt = $conn->prepare("INSERT INTO projects (id, sync_id, name, client, location, startDate, budget, status, description, contactNumber, isGodown) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['projects'] as $p) {
                $isG = $p['isGodown'] ? 1 : 0;
                $stmt->bind_param("sssssdssssi", $p['id'], $syncId, $p['name'], $p['client'], $p['location'], $p['startDate'], $p['budget'], $p['status'], $p['description'], $p['contactNumber'], $isG);
                $stmt->execute();
            }
        }

        // 3. Clean and Map Vendors
        $conn->query("DELETE FROM vendors WHERE sync_id = '$syncId'");
        if (!empty($data['vendors'])) {
            $stmt = $conn->prepare("INSERT INTO vendors (id, sync_id, name, phone, address, category, balance) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['vendors'] as $v) {
                $stmt->bind_param("ssssssd", $v['id'], $syncId, $v['name'], $v['phone'], $v['address'], $v['category'], $v['balance']);
                $stmt->execute();
            }
        }

        // 4. Clean and Map Materials
        $conn->query("DELETE FROM materials WHERE sync_id = '$syncId'");
        if (!empty($data['materials'])) {
            $stmt = $conn->prepare("INSERT INTO materials (id, sync_id, name, unit, costPerUnit, totalPurchased, totalUsed) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['materials'] as $m) {
                $stmt->bind_param("ssssddd", $m['id'], $syncId, $m['name'], $m['unit'], $m['costPerUnit'], $m['totalPurchased'], $m['totalUsed']);
                $stmt->execute();
            }
        }

        // 5. Clean and Map Expenses
        $conn->query("DELETE FROM expenses WHERE sync_id = '$syncId'");
        if (!empty($data['expenses'])) {
            $stmt = $conn->prepare("INSERT INTO expenses (id, sync_id, date, projectId, vendorId, materialId, materialQuantity, amount, paymentMethod, category, notes, inventoryAction, parentPurchaseId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['expenses'] as $e) {
                $stmt->bind_param("ssssssddsssss", $e['id'], $syncId, $e['date'], $e['projectId'], $e['vendorId'], $e['materialId'], $e['materialQuantity'], $e['amount'], $e['paymentMethod'], $e['category'], $e['notes'], $e['inventoryAction'], $e['parentPurchaseId']);
                $stmt->execute();
            }
        }

        // 6. Clean and Map Incomes
        $conn->query("DELETE FROM incomes WHERE sync_id = '$syncId'");
        if (!empty($data['incomes'])) {
            $stmt = $conn->prepare("INSERT INTO incomes (id, sync_id, projectId, date, amount, description, method, invoiceId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['incomes'] as $i) {
                $stmt->bind_param("ssssdsss", $i['id'], $syncId, $i['projectId'], $i['date'], $i['amount'], $i['description'], $i['method'], $i['invoiceId']);
                $stmt->execute();
            }
        }

        // 7. Clean and Map Invoices
        $conn->query("DELETE FROM invoices WHERE sync_id = '$syncId'");
        if (!empty($data['invoices'])) {
            $stmt = $conn->prepare("INSERT INTO invoices (id, sync_id, projectId, date, dueDate, amount, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['invoices'] as $inv) {
                $stmt->bind_param("sssssdss", $inv['id'], $syncId, $inv['projectId'], $inv['date'], $inv['dueDate'], $inv['amount'], $inv['description'], $inv['status']);
                $stmt->execute();
            }
        }

        // 8. Clean and Map Payments
        $conn->query("DELETE FROM payments WHERE sync_id = '$syncId'");
        if (!empty($data['payments'])) {
            $stmt = $conn->prepare("INSERT INTO payments (id, sync_id, date, vendorId, projectId, amount, method, reference, materialBatchId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['payments'] as $pay) {
                $stmt->bind_param("sssssdsss", $pay['id'], $syncId, $pay['date'], $pay['vendorId'], $pay['projectId'], $pay['amount'], $pay['method'], $pay['reference'], $pay['materialBatchId']);
                $stmt->execute();
            }
        }

        $conn->commit();
        echo json_encode(["success" => true, "timestamp" => $ts, "relational_sync" => "complete"]);

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(["error" => "Transaction Failed: " . $e->getMessage()]);
    }
}

$conn->close();
?>
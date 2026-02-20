<?php
/**
 * BuildMaster Pro - PHP API Bridge for cPanel/Shared Hosting
 * 
 * This script handles data persistence using either MySQL or a local JSON file.
 * It automatically falls back to db.json if MySQL is not configured.
 */

require_once 'config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}

$dataFile = 'db.json';
$useMySQL = !empty(DB_HOST) && !empty(DB_NAME);

/**
 * Database Connection Helper
 */
function getDBConnection() {
    if (!empty(DB_HOST) && !empty(DB_NAME)) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            return new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            return null;
        }
    }
    return null;
}

$action = $_GET['action'] ?? '';
$syncId = $_GET['syncId'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    if ($action === 'test_connection') {
        $conn = getDBConnection();
        $mode = $conn ? "MySQL" : "Local JSON";
        $writable = is_writable('.') || (file_exists($dataFile) && is_writable($dataFile));
        
        echo json_encode([
            'success' => true, 
            'message' => "Bridge Reachable (Mode: $mode)",
            'db_connected' => $conn !== null,
            'storage_writable' => $writable
        ]);
        exit;
    }

    if ($action === 'initialize_db') {
        $conn = getDBConnection();
        if ($conn) {
            try {
                $sql = "CREATE TABLE IF NOT EXISTS sessions (
                    syncId VARCHAR(255) PRIMARY KEY,
                    state LONGTEXT NOT NULL,
                    lastUpdated BIGINT NOT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
                $conn->exec($sql);
                echo json_encode(['success' => true, 'message' => 'MySQL Tables Initialized']);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
        } else {
            // Fallback to JSON initialization
            $success = file_put_contents($dataFile, json_encode(['sessions' => (object)[]]));
            if ($success === false) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Cannot write to db.json. Check folder permissions.']);
            } else {
                echo json_encode(['success' => true, 'message' => 'Local JSON Database Initialized']);
            }
        }
        exit;
    }

    if ($action === 'sync') {
        if (!$syncId) {
            http_response_code(400);
            echo json_encode(['error' => 'No syncId']);
            exit;
        }

        $conn = getDBConnection();
        if ($conn) {
            $stmt = $conn->prepare("SELECT state FROM sessions WHERE syncId = ?");
            $stmt->execute([$syncId]);
            $row = $stmt->fetch();
            if ($row) {
                echo $row['state'];
            } else {
                echo json_encode(['status' => 'new']);
            }
        } else {
            // JSON Fallback
            if (!file_exists($dataFile) || filesize($dataFile) < 2) {
                echo json_encode(['status' => 'new']);
                exit;
            }
            $content = file_get_contents($dataFile);
            $db = json_decode($content, true);
            if (!$db || !isset($db['sessions'])) {
                echo json_encode(['status' => 'new']);
                exit;
            }
            
            if (isset($db['sessions'][$syncId])) {
                echo json_encode($db['sessions'][$syncId]['state']);
            } else {
                echo json_encode(['status' => 'new']);
            }
        }
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'save_state' || (isset($input['syncId']) && $action === '')) {
        $data = $input;
        if (!$data || !isset($data['syncId'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid payload']);
            exit;
        }

        $syncId = $data['syncId'];
        $stateJson = json_encode($data);
        $timestamp = round(microtime(true) * 1000);

        $conn = getDBConnection();
        if ($conn) {
            try {
                $stmt = $conn->prepare("INSERT INTO sessions (syncId, state, lastUpdated) 
                                        VALUES (?, ?, ?) 
                                        ON DUPLICATE KEY UPDATE state = VALUES(state), lastUpdated = VALUES(lastUpdated)");
                $stmt->execute([$syncId, $stateJson, $timestamp]);
                echo json_encode(['success' => true, 'mode' => 'MySQL']);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
        } else {
            // JSON Fallback
            $db = (file_exists($dataFile) && filesize($dataFile) > 2) ? json_decode(file_get_contents($dataFile), true) : ['sessions' => []];
            if (!$db || !isset($db['sessions'])) $db = ['sessions' => []];
            
            $db['sessions'][$syncId] = [
                'state' => $data,
                'lastUpdated' => $timestamp
            ];

            $success = file_put_contents($dataFile, json_encode($db, JSON_PRETTY_PRINT));
            if ($success === false) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to write to db.json']);
            } else {
                echo json_encode(['success' => true, 'mode' => 'JSON']);
            }
        }
        exit;
    }
}

http_response_code(404);
echo json_encode(['error' => 'Action not found']);

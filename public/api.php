<?php
/**
 * BuildMaster Pro - PHP API Bridge for cPanel/Shared Hosting
 * 
 * Relational Database Version
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

$tablesSchema = [
    'projects' => [
        'id' => 'VARCHAR(255) PRIMARY KEY',
        'syncId' => 'VARCHAR(255)',
        'name' => 'VARCHAR(255)',
        'client' => 'VARCHAR(255)',
        'location' => 'VARCHAR(255)',
        'startDate' => 'VARCHAR(50)',
        'endDate' => 'VARCHAR(50)',
        'budget' => 'DECIMAL(15,2)',
        'status' => 'VARCHAR(50)',
        'description' => 'TEXT',
        'contactNumber' => 'VARCHAR(50)',
        'isGodown' => 'BOOLEAN',
        'isDeleted' => 'BOOLEAN'
    ],
    'vendors' => [
        'id' => 'VARCHAR(255) PRIMARY KEY',
        'syncId' => 'VARCHAR(255)',
        'name' => 'VARCHAR(255)',
        'phone' => 'VARCHAR(50)',
        'address' => 'TEXT',
        'category' => 'VARCHAR(100)',
        'email' => 'VARCHAR(255)',
        'balance' => 'DECIMAL(15,2)',
        'isActive' => 'BOOLEAN'
    ],
    'materials' => [
        'id' => 'VARCHAR(255) PRIMARY KEY',
        'syncId' => 'VARCHAR(255)',
        'name' => 'VARCHAR(255)',
        'unit' => 'VARCHAR(50)',
        'costPerUnit' => 'DECIMAL(15,2)',
        'totalPurchased' => 'DECIMAL(15,2)',
        'totalUsed' => 'DECIMAL(15,2)',
        'lowStockThreshold' => 'DECIMAL(15,2)'
    ],
    'stockHistory' => [
        'id' => 'VARCHAR(255) PRIMARY KEY',
        'syncId' => 'VARCHAR(255)',
        'materialId' => 'VARCHAR(255)',
        'date' => 'VARCHAR(50)',
        'type' => 'VARCHAR(50)',
        'quantity' => 'DECIMAL(15,2)',
        'projectId' => 'VARCHAR(255)',
        'vendorId' => 'VARCHAR(255)',
        'note' => 'TEXT',
        'unitPrice' => 'DECIMAL(15,2)',
        'parentPurchaseId' => 'VARCHAR(255)'
    ],
    'expenses' => [
        'id' => 'VARCHAR(255) PRIMARY KEY',
        'syncId' => 'VARCHAR(255)',
        'date' => 'VARCHAR(50)',
        'projectId' => 'VARCHAR(255)',
        'vendorId' => 'VARCHAR(255)',
        'materialId' => 'VARCHAR(255)',
        'materialQuantity' => 'DECIMAL(15,2)',
        'unitPrice' => 'DECIMAL(15,2)',
        'amount' => 'DECIMAL(15,2)',
        'paymentMethod' => 'VARCHAR(50)',
        'notes' => 'TEXT',
        'invoiceUrl' => 'TEXT',
        'category' => 'VARCHAR(100)',
        'inventoryAction' => 'VARCHAR(50)',
        'parentPurchaseId' => 'VARCHAR(255)'
    ],
    'incomes' => [
        'id' => 'VARCHAR(255) PRIMARY KEY',
        'syncId' => 'VARCHAR(255)',
        'projectId' => 'VARCHAR(255)',
        'date' => 'VARCHAR(50)',
        'amount' => 'DECIMAL(15,2)',
        'description' => 'TEXT',
        'method' => 'VARCHAR(50)',
        'invoiceId' => 'VARCHAR(255)'
    ],
    'invoices' => [
        'id' => 'VARCHAR(255) PRIMARY KEY',
        'syncId' => 'VARCHAR(255)',
        'projectId' => 'VARCHAR(255)',
        'date' => 'VARCHAR(50)',
        'amount' => 'DECIMAL(15,2)',
        'description' => 'TEXT',
        'status' => 'VARCHAR(50)',
        'dueDate' => 'VARCHAR(50)'
    ],
    'payments' => [
        'id' => 'VARCHAR(255) PRIMARY KEY',
        'syncId' => 'VARCHAR(255)',
        'date' => 'VARCHAR(50)',
        'vendorId' => 'VARCHAR(255)',
        'projectId' => 'VARCHAR(255)',
        'amount' => 'DECIMAL(15,2)',
        'method' => 'VARCHAR(50)',
        'reference' => 'TEXT',
        'materialBatchId' => 'VARCHAR(255)',
        'masterPaymentId' => 'VARCHAR(255)',
        'isAllocation' => 'BOOLEAN'
    ],
    'employees' => [
        'id' => 'VARCHAR(255) PRIMARY KEY',
        'syncId' => 'VARCHAR(255)',
        'name' => 'VARCHAR(255)',
        'role' => 'VARCHAR(100)',
        'phone' => 'VARCHAR(50)',
        'dailyWage' => 'DECIMAL(15,2)',
        'status' => 'VARCHAR(50)',
        'joiningDate' => 'VARCHAR(50)',
        'currentSiteId' => 'VARCHAR(255)'
    ],
    'laborLogs' => [
        'id' => 'VARCHAR(255) PRIMARY KEY',
        'syncId' => 'VARCHAR(255)',
        'date' => 'VARCHAR(50)',
        'employeeId' => 'VARCHAR(255)',
        'projectId' => 'VARCHAR(255)',
        'hoursWorked' => 'DECIMAL(10,2)',
        'wageAmount' => 'DECIMAL(15,2)',
        'status' => 'VARCHAR(50)',
        'notes' => 'TEXT'
    ],
    'laborPayments' => [
        'id' => 'VARCHAR(255) PRIMARY KEY',
        'syncId' => 'VARCHAR(255)',
        'employeeId' => 'VARCHAR(255)',
        'date' => 'VARCHAR(50)',
        'amount' => 'DECIMAL(15,2)',
        'method' => 'VARCHAR(50)',
        'reference' => 'TEXT',
        'notes' => 'TEXT'
    ],
    'activityLogs' => [
        'id' => 'VARCHAR(255) PRIMARY KEY',
        'syncId' => 'VARCHAR(255)',
        'timestamp' => 'VARCHAR(50)',
        'action' => 'VARCHAR(100)',
        'entityType' => 'VARCHAR(100)',
        'entityId' => 'VARCHAR(255)',
        'details' => 'TEXT',
        'userId' => 'VARCHAR(255)',
        'userName' => 'VARCHAR(255)'
    ],
    'users' => [
        'id' => 'VARCHAR(255) PRIMARY KEY',
        'syncId' => 'VARCHAR(255)',
        'name' => 'VARCHAR(255)',
        'email' => 'VARCHAR(255)',
        'role' => 'VARCHAR(50)',
        'avatar' => 'TEXT',
        'permissions' => 'JSON',
        'password' => 'VARCHAR(255)'
    ]
];

$appSettingsSchema = [
    'syncId' => 'VARCHAR(255) PRIMARY KEY',
    'tradeCategories' => 'JSON',
    'stockingUnits' => 'JSON',
    'siteStatuses' => 'JSON',
    'allowDecimalStock' => 'BOOLEAN',
    'theme' => 'VARCHAR(50)',
    'currentUser' => 'JSON',
    'lastUpdated' => 'BIGINT'
];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    if ($action === 'test_connection') {
        $conn = getDBConnection();
        $mode = $conn ? "MySQL (Relational)" : "Local JSON";
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
                foreach ($tablesSchema as $tableName => $columns) {
                    $colsDef = [];
                    foreach ($columns as $colName => $colType) {
                        $colsDef[] = "$colName $colType";
                    }
                    $sql = "CREATE TABLE IF NOT EXISTS $tableName (" . implode(', ', $colsDef) . ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
                    $conn->exec($sql);
                }
                
                $appSetCols = [];
                foreach ($appSettingsSchema as $colName => $colType) {
                    $appSetCols[] = "$colName $colType";
                }
                $sql = "CREATE TABLE IF NOT EXISTS app_settings (" . implode(', ', $appSetCols) . ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
                $conn->exec($sql);
                
                // Keep sessions table for fallback/legacy if needed
                $conn->exec("CREATE TABLE IF NOT EXISTS sessions (syncId VARCHAR(255) PRIMARY KEY, state LONGTEXT NOT NULL, lastUpdated BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                echo json_encode(['success' => true, 'message' => 'MySQL Relational Tables Initialized']);
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
            try {
                // Check if app_settings exists for this syncId
                $stmt = $conn->prepare("SELECT * FROM app_settings WHERE syncId = ?");
                $stmt->execute([$syncId]);
                $settings = $stmt->fetch();
                
                if (!$settings) {
                    // Try legacy sessions table
                    $stmt = $conn->prepare("SELECT state FROM sessions WHERE syncId = ?");
                    $stmt->execute([$syncId]);
                    $row = $stmt->fetch();
                    if ($row) {
                        echo $row['state'];
                    } else {
                        echo json_encode(['status' => 'new']);
                    }
                    exit;
                }
                
                $state = [];
                
                // Load settings
                $state['tradeCategories'] = json_decode($settings['tradeCategories'] ?? '[]', true);
                $state['stockingUnits'] = json_decode($settings['stockingUnits'] ?? '[]', true);
                $state['siteStatuses'] = json_decode($settings['siteStatuses'] ?? '[]', true);
                $state['allowDecimalStock'] = (bool)$settings['allowDecimalStock'];
                $state['theme'] = $settings['theme'];
                $state['currentUser'] = json_decode($settings['currentUser'] ?? 'null', true);
                $state['lastUpdated'] = (int)$settings['lastUpdated'];
                $state['syncId'] = $syncId;
                
                // Load all tables
                foreach (array_keys($tablesSchema) as $table) {
                    if ($table === 'stockHistory') continue; // Handled specially
                    
                    $stmt = $conn->prepare("SELECT * FROM $table WHERE syncId = ?");
                    $stmt->execute([$syncId]);
                    $rows = $stmt->fetchAll();
                    
                    // Parse JSON/Boolean fields
                    foreach ($rows as &$row) {
                        foreach ($tablesSchema[$table] as $col => $type) {
                            if ($type === 'JSON' && isset($row[$col])) {
                                $row[$col] = json_decode($row[$col], true);
                            } else if ($type === 'BOOLEAN' && isset($row[$col])) {
                                $row[$col] = (bool)$row[$col];
                            } else if (strpos($type, 'DECIMAL') !== false && isset($row[$col])) {
                                $row[$col] = (float)$row[$col];
                            }
                        }
                        unset($row['syncId']); // Remove syncId from frontend state
                    }
                    $state[$table] = $rows;
                }
                
                // Load stock history and attach to materials
                $stmt = $conn->prepare("SELECT * FROM stockHistory WHERE syncId = ?");
                $stmt->execute([$syncId]);
                $historyRows = $stmt->fetchAll();
                
                $historyByMaterial = [];
                foreach ($historyRows as $hRow) {
                    $matId = $hRow['materialId'];
                    if (!isset($historyByMaterial[$matId])) {
                        $historyByMaterial[$matId] = [];
                    }
                    unset($hRow['syncId']);
                    unset($hRow['materialId']);
                    foreach ($tablesSchema['stockHistory'] as $col => $type) {
                        if (strpos($type, 'DECIMAL') !== false && isset($hRow[$col])) {
                            $hRow[$col] = (float)$hRow[$col];
                        }
                    }
                    $historyByMaterial[$matId][] = $hRow;
                }
                
                foreach ($state['materials'] as &$mat) {
                    $mat['history'] = $historyByMaterial[$mat['id']] ?? [];
                }
                
                echo json_encode($state);
                
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['error' => $e->getMessage()]);
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

function syncTable($conn, $tableName, $syncId, $items, $columns) {
    if (!is_array($items)) return;
    
    // Get existing IDs
    $stmt = $conn->prepare("SELECT id FROM $tableName WHERE syncId = ?");
    $stmt->execute([$syncId]);
    $existingIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $incomingIds = [];
    
    foreach ($items as $item) {
        if (!isset($item['id'])) continue;
        $incomingIds[] = $item['id'];
        
        $cols = ['syncId'];
        $vals = [$syncId];
        $updates = [];
        
        foreach ($columns as $col => $type) {
            if ($col === 'syncId') continue;
            
            $cols[] = $col;
            $val = isset($item[$col]) ? $item[$col] : null;
            
            if ($type === 'JSON') {
                $val = $val !== null ? json_encode($val) : null;
            } else if ($type === 'BOOLEAN') {
                $val = $val ? 1 : 0;
            }
            
            $vals[] = $val;
            
            if ($col !== 'id') {
                $updates[] = "$col = VALUES($col)";
            }
        }
        
        $placeholders = implode(',', array_fill(0, count($cols), '?'));
        $colNames = implode(',', $cols);
        $updateStr = implode(',', $updates);
        
        if (empty($updates)) {
            $sql = "INSERT IGNORE INTO $tableName ($colNames) VALUES ($placeholders)";
        } else {
            $sql = "INSERT INTO $tableName ($colNames) VALUES ($placeholders) ON DUPLICATE KEY UPDATE $updateStr";
        }
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($vals);
    }
    
    // Delete missing IDs
    $toDelete = array_diff($existingIds, $incomingIds);
    if (!empty($toDelete)) {
        $placeholders = implode(',', array_fill(0, count($toDelete), '?'));
        $sql = "DELETE FROM $tableName WHERE syncId = ? AND id IN ($placeholders)";
        $params = array_merge([$syncId], $toDelete);
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
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
        $timestamp = round(microtime(true) * 1000);

        $conn = getDBConnection();
        if ($conn) {
            try {
                $conn->beginTransaction();
                
                // Save App Settings
                $stmt = $conn->prepare("INSERT INTO app_settings (syncId, tradeCategories, stockingUnits, siteStatuses, allowDecimalStock, theme, currentUser, lastUpdated) 
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
                                        ON DUPLICATE KEY UPDATE 
                                        tradeCategories=VALUES(tradeCategories), stockingUnits=VALUES(stockingUnits), 
                                        siteStatuses=VALUES(siteStatuses), allowDecimalStock=VALUES(allowDecimalStock), 
                                        theme=VALUES(theme), currentUser=VALUES(currentUser), lastUpdated=VALUES(lastUpdated)");
                $stmt->execute([
                    $syncId,
                    json_encode($data['tradeCategories'] ?? []),
                    json_encode($data['stockingUnits'] ?? []),
                    json_encode($data['siteStatuses'] ?? []),
                    !empty($data['allowDecimalStock']) ? 1 : 0,
                    $data['theme'] ?? 'light',
                    json_encode($data['currentUser'] ?? null),
                    $timestamp
                ]);
                
                // Save Tables
                foreach ($tablesSchema as $table => $columns) {
                    if ($table === 'stockHistory') continue;
                    $items = $data[$table] ?? [];
                    syncTable($conn, $table, $syncId, $items, $columns);
                }
                
                // Extract and save stock history
                $allHistory = [];
                if (isset($data['materials']) && is_array($data['materials'])) {
                    foreach ($data['materials'] as $mat) {
                        if (isset($mat['history']) && is_array($mat['history'])) {
                            foreach ($mat['history'] as $h) {
                                $h['materialId'] = $mat['id'];
                                $allHistory[] = $h;
                            }
                        }
                    }
                }
                syncTable($conn, 'stockHistory', $syncId, $allHistory, $tablesSchema['stockHistory']);
                
                // Also save to legacy sessions table for backup/fallback
                $stateJson = json_encode($data);
                $stmt = $conn->prepare("INSERT INTO sessions (syncId, state, lastUpdated) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE state = VALUES(state), lastUpdated = VALUES(lastUpdated)");
                $stmt->execute([$syncId, $stateJson, $timestamp]);
                
                $conn->commit();
                echo json_encode(['success' => true, 'mode' => 'MySQL Relational']);
            } catch (PDOException $e) {
                $conn->rollBack();
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
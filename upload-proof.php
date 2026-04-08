<?php
header('Content-Type: application/json');

date_default_timezone_set('Asia/Jakarta');

function respond($statusCode, $payload) {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, [
        'success' => false,
        'message' => 'Metode request tidak diizinkan.'
    ]);
}

$requiredFields = ['nama', 'tanggal', 'jam', 'jenis', 'pembayaran'];
foreach ($requiredFields as $field) {
    if (empty($_POST[$field])) {
        respond(422, [
            'success' => false,
            'message' => 'Data booking belum lengkap.'
        ]);
    }
}

if (!isset($_FILES['bukti']) || $_FILES['bukti']['error'] !== UPLOAD_ERR_OK) {
    respond(422, [
        'success' => false,
        'message' => 'Bukti transfer belum berhasil diupload.'
    ]);
}

$file = $_FILES['bukti'];
$maxSize = 5 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    respond(422, [
        'success' => false,
        'message' => 'Ukuran bukti transfer maksimal 5 MB.'
    ]);
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowedTypes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp'
];

if (!isset($allowedTypes[$mimeType])) {
    respond(422, [
        'success' => false,
        'message' => 'Format bukti transfer harus JPG, PNG, atau WEBP.'
    ]);
}

$bookingCode = 'BB-' . date('Ymd-His') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
$extension = $allowedTypes[$mimeType];
$uploadDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'bukti-transfer' . DIRECTORY_SEPARATOR . date('Y') . DIRECTORY_SEPARATOR . date('m');

if (!is_dir($uploadDir) && !mkdir($uploadDir, 0777, true) && !is_dir($uploadDir)) {
    respond(500, [
        'success' => false,
        'message' => 'Folder penyimpanan bukti transfer tidak berhasil dibuat.'
    ]);
}

$filename = $bookingCode . '.' . $extension;
$destination = $uploadDir . DIRECTORY_SEPARATOR . $filename;

if (!move_uploaded_file($file['tmp_name'], $destination)) {
    respond(500, [
        'success' => false,
        'message' => 'Bukti transfer gagal disimpan di server.'
    ]);
}

$relativeProofPath = 'uploads/bukti-transfer/' . date('Y') . '/' . date('m') . '/' . $filename;
$dataDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
if (!is_dir($dataDir) && !mkdir($dataDir, 0777, true) && !is_dir($dataDir)) {
    respond(500, [
        'success' => false,
        'message' => 'Folder data booking tidak berhasil dibuat.'
    ]);
}

$dataFile = $dataDir . DIRECTORY_SEPARATOR . 'bookings.json';
$existingBookings = [];
if (file_exists($dataFile)) {
    $decoded = json_decode((string) file_get_contents($dataFile), true);
    if (is_array($decoded)) {
        $existingBookings = $decoded;
    }
}

$bookingRecord = [
    'booking_code' => $bookingCode,
    'created_at' => date('Y-m-d H:i:s'),
    'nama' => trim((string) ($_POST['nama'] ?? '')),
    'tanggal' => trim((string) ($_POST['tanggal'] ?? '')),
    'jam' => trim((string) ($_POST['jam'] ?? '')),
    'jenis' => trim((string) ($_POST['jenis'] ?? '')),
    'pembayaran' => trim((string) ($_POST['pembayaran'] ?? '')),
    'kabupaten' => trim((string) ($_POST['kabupaten'] ?? '')),
    'kecamatan' => trim((string) ($_POST['kecamatan'] ?? '')),
    'alamat' => trim((string) ($_POST['alamat'] ?? '')),
    'patokan' => trim((string) ($_POST['patokan'] ?? '')),
    'travel_time_text' => trim((string) ($_POST['travel_time_text'] ?? '')),
    'validation_source' => trim((string) ($_POST['validation_source'] ?? '')),
    'latitude' => trim((string) ($_POST['latitude'] ?? '')),
    'longitude' => trim((string) ($_POST['longitude'] ?? '')),
    'proof_path' => $relativeProofPath,
    'proof_original_name' => $file['name'],
    'proof_mime_type' => $mimeType,
    'proof_size' => (int) $file['size']
];

array_unshift($existingBookings, $bookingRecord);

if (file_put_contents($dataFile, json_encode($existingBookings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) === false) {
    respond(500, [
        'success' => false,
        'message' => 'Data booking gagal disimpan.'
    ]);
}

respond(200, [
    'success' => true,
    'message' => 'Bukti transfer berhasil disimpan.',
    'booking_code' => $bookingCode,
    'proof_path' => $relativeProofPath
]);

<?php
header('Content-Type: application/json');

$apiKey = '3d673155538f4da29137b06e6576f37e';
$originAddress = 'GMM9+FPM, Jl. Karya Kasih, Pangkalan Masyhur, Kec. Medan Johor, Kota Medan, Sumatera Utara 20143';
$travelTimeLimitSeconds = 3600;

function respond($statusCode, $payload) {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

function requestJson($url) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_FAILONERROR => false,
    ]);

    $response = curl_exec($ch);
    $error = curl_error($ch);
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        respond(500, [
            'success' => false,
            'message' => 'Gagal menghubungi layanan peta: ' . $error
        ]);
    }

    $decoded = json_decode($response, true);

    return [
        'status' => $statusCode,
        'data' => $decoded
    ];
}

function formatTravelTime($seconds) {
    $totalMinutes = (int) ceil($seconds / 60);
    $hours = intdiv($totalMinutes, 60);
    $minutes = $totalMinutes % 60;

    if ($hours > 0 && $minutes > 0) {
        return $hours . ' jam ' . $minutes . ' menit';
    }

    if ($hours > 0) {
        return $hours . ' jam';
    }

    return $totalMinutes . ' menit';
}

function joinAddressParts($parts) {
    $filtered = [];

    foreach ($parts as $part) {
        $value = trim((string) $part);
        if ($value !== '' && !in_array($value, $filtered, true)) {
            $filtered[] = $value;
        }
    }

    return implode(', ', $filtered);
}

function buildDetectedAddress($address) {
    $line1 = '';

    if (!empty($address['housenumber']) || !empty($address['street'])) {
        $line1 = trim(($address['street'] ?? '') . ' ' . ($address['housenumber'] ?? ''));
    }

    if ($line1 === '' && !empty($address['address_line1'])) {
        $line1 = trim((string) $address['address_line1']);
    }

    $line2 = joinAddressParts([
        $address['suburb'] ?? '',
        $address['district'] ?? '',
        $address['city_district'] ?? '',
        $address['city'] ?? '',
        $address['county'] ?? '',
        $address['state'] ?? '',
        $address['postcode'] ?? ''
    ]);

    $detailed = joinAddressParts([$line1, $line2]);

    if ($detailed !== '') {
        return $detailed;
    }

    if (!empty($address['formatted'])) {
        return trim((string) $address['formatted']);
    }

    return joinAddressParts([
        $address['address_line1'] ?? '',
        $address['address_line2'] ?? ''
    ]);
}

function addressNeedsCompletion($address) {
    $resultType = $address['result_type'] ?? '';
    $hasStreet = !empty($address['street']);
    $hasHouseNumber = !empty($address['housenumber']);
    $hasAddressLine1 = !empty($address['address_line1']);

    if ($hasStreet && $hasHouseNumber) {
        return false;
    }

    if (in_array($resultType, ['building', 'amenity'], true) && ($hasStreet || $hasAddressLine1)) {
        return false;
    }

    return true;
}

function geocodeAddress($text, $apiKey) {
    $url = 'https://api.geoapify.com/v1/geocode/search?text=' .
        rawurlencode($text) .
        '&filter=countrycode:id&limit=1&format=json&apiKey=' . rawurlencode($apiKey);

    $result = requestJson($url);

    if ($result['status'] >= 400 || empty($result['data']['results'][0])) {
        return null;
    }

    return $result['data']['results'][0];
}

function reverseGeocode($latitude, $longitude, $apiKey) {
    $url = 'https://api.geoapify.com/v1/geocode/reverse?lat=' .
        rawurlencode((string) $latitude) .
        '&lon=' . rawurlencode((string) $longitude) .
        '&format=json&apiKey=' . rawurlencode($apiKey);

    $result = requestJson($url);

    if ($result['status'] >= 400 || empty($result['data']['results'][0])) {
        return null;
    }

    return $result['data']['results'][0];
}

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    respond(400, [
        'success' => false,
        'message' => 'Data lokasi tidak valid.'
    ]);
}

$userAddressInput = trim((string) ($input['address'] ?? ''));
$latitude = isset($input['latitude']) ? (float) $input['latitude'] : 0;
$longitude = isset($input['longitude']) ? (float) $input['longitude'] : 0;

$origin = geocodeAddress($originAddress, $apiKey);

if ($origin === null) {
    respond(502, [
        'success' => false,
        'message' => 'Alamat Brothers Barbershop tidak berhasil dipetakan.'
    ]);
}

$originLat = (float) $origin['lat'];
$originLon = (float) $origin['lon'];
$destination = null;
$detectedAddress = '';
$needsCompletion = true;

if ($userAddressInput !== '') {
    $destination = geocodeAddress($userAddressInput, $apiKey);

    if ($destination === null) {
        respond(422, [
            'success' => false,
            'message' => 'Alamat yang dimasukkan belum berhasil ditemukan. Coba tulis lebih lengkap dengan jalan, kecamatan, atau patokan terdekat.'
        ]);
    }

    $latitude = (float) $destination['lat'];
    $longitude = (float) $destination['lon'];
    $detectedAddress = buildDetectedAddress($destination);
    $needsCompletion = addressNeedsCompletion($destination);
} elseif ($latitude && $longitude) {
    $destination = reverseGeocode($latitude, $longitude, $apiKey);

    if ($destination !== null) {
        $detectedAddress = buildDetectedAddress($destination);
        $needsCompletion = addressNeedsCompletion($destination);
    }
} else {
    respond(400, [
        'success' => false,
        'message' => 'Masukkan alamat atau izinkan lokasi perangkat terlebih dahulu.'
    ]);
}

$routingUrl = 'https://api.geoapify.com/v1/routing?waypoints=' .
    rawurlencode($originLat . ',' . $originLon . '|' . $latitude . ',' . $longitude) .
    '&mode=drive&format=json&apiKey=' . rawurlencode($apiKey);

$routingResult = requestJson($routingUrl);

if ($routingResult['status'] >= 400 || empty($routingResult['data']['results'][0])) {
    respond(502, [
        'success' => false,
        'message' => 'Waktu tempuh Home Service tidak berhasil dihitung.'
    ]);
}

$route = $routingResult['data']['results'][0];
$travelTimeSeconds = isset($route['time']) ? (int) $route['time'] : null;
$distanceMeters = isset($route['distance']) ? (float) $route['distance'] : null;

if ($travelTimeSeconds === null) {
    respond(502, [
        'success' => false,
        'message' => 'Durasi perjalanan tidak tersedia dari layanan peta.'
    ]);
}

respond(200, [
    'success' => true,
    'allowed' => $travelTimeSeconds <= $travelTimeLimitSeconds,
    'travel_time_seconds' => $travelTimeSeconds,
    'travel_time_text' => formatTravelTime($travelTimeSeconds),
    'distance_meters' => $distanceMeters,
    'detected_address' => $detectedAddress,
    'address_needs_completion' => $needsCompletion,
    'origin' => [
        'address' => $originAddress,
        'latitude' => $originLat,
        'longitude' => $originLon,
    ],
    'destination' => [
        'latitude' => $latitude,
        'longitude' => $longitude,
    ],
]);

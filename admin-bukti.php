<?php
$dataFile = __DIR__ . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'bookings.json';
$bookings = [];
if (file_exists($dataFile)) {
    $decoded = json_decode((string) file_get_contents($dataFile), true);
    if (is_array($decoded)) {
        $bookings = $decoded;
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Bukti Transfer</title>
<style>
*{box-sizing:border-box;font-family:Arial,sans-serif}
body{margin:0;background:#eef2e6;color:#2d3a17;padding:24px}
.wrapper{max-width:1100px;margin:0 auto}
h1{margin:0 0 8px;font-size:32px}
p.meta{margin:0 0 24px;color:#5d6f35}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}
.card{background:#fff;border:1px solid #ced8bb;border-radius:18px;padding:18px;box-shadow:0 10px 24px rgba(0,0,0,.08)}
.card h2{margin:0 0 10px;font-size:18px;color:#445723}
.card p{margin:6px 0;line-height:1.5}
.label{font-weight:bold;color:#445723}
.proof{margin-top:14px}
.proof img{width:100%;height:260px;object-fit:cover;border-radius:14px;border:1px solid #ced8bb;display:block}
.empty{background:#fff;border:1px dashed #a9b98b;border-radius:18px;padding:24px;text-align:center;color:#6a7d3f}
a.btn{display:inline-block;margin-top:12px;background:#6b8e23;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:bold}
</style>
</head>
<body>
<div class="wrapper">
  <h1>Admin Bukti Transfer</h1>
  <p class="meta">Halaman ini menampilkan bukti transfer yang sudah diupload user.</p>

  <?php if (empty($bookings)): ?>
    <div class="empty">Belum ada booking atau bukti transfer yang tersimpan.</div>
  <?php else: ?>
    <div class="grid">
      <?php foreach ($bookings as $booking): ?>
        <div class="card">
          <h2><?php echo htmlspecialchars($booking['booking_code'] ?? '-'); ?></h2>
          <p><span class="label">Waktu Upload:</span> <?php echo htmlspecialchars($booking['created_at'] ?? '-'); ?></p>
          <p><span class="label">Nama:</span> <?php echo htmlspecialchars($booking['nama'] ?? '-'); ?></p>
          <p><span class="label">Tanggal:</span> <?php echo htmlspecialchars($booking['tanggal'] ?? '-'); ?></p>
          <p><span class="label">Jam:</span> <?php echo htmlspecialchars($booking['jam'] ?? '-'); ?></p>
          <p><span class="label">Layanan:</span> <?php echo htmlspecialchars($booking['jenis'] ?? '-'); ?></p>
          <p><span class="label">Pembayaran:</span> <?php echo htmlspecialchars($booking['pembayaran'] ?? '-'); ?></p>
          <?php if (!empty($booking['kabupaten'])): ?><p><span class="label">Kabupaten/Kota:</span> <?php echo htmlspecialchars($booking['kabupaten']); ?></p><?php endif; ?>
          <?php if (!empty($booking['kecamatan'])): ?><p><span class="label">Kecamatan:</span> <?php echo htmlspecialchars($booking['kecamatan']); ?></p><?php endif; ?>
          <?php if (!empty($booking['alamat'])): ?><p><span class="label">Alamat:</span> <?php echo htmlspecialchars($booking['alamat']); ?></p><?php endif; ?>
          <?php if (!empty($booking['patokan'])): ?><p><span class="label">Patokan:</span> <?php echo htmlspecialchars($booking['patokan']); ?></p><?php endif; ?>
          <?php if (!empty($booking['travel_time_text'])): ?><p><span class="label">Estimasi Waktu:</span> <?php echo htmlspecialchars($booking['travel_time_text']); ?></p><?php endif; ?>
          <?php if (!empty($booking['validation_source'])): ?><p><span class="label">Metode Cek:</span> <?php echo htmlspecialchars($booking['validation_source']); ?></p><?php endif; ?>
          <?php if (!empty($booking['latitude']) && !empty($booking['longitude'])): ?><p><span class="label">Koordinat:</span> <?php echo htmlspecialchars($booking['latitude'] . ', ' . $booking['longitude']); ?></p><?php endif; ?>

          <?php if (!empty($booking['proof_path'])): ?>
            <div class="proof">
              <img src="<?php echo htmlspecialchars($booking['proof_path']); ?>" alt="Bukti Transfer">
              <a class="btn" href="<?php echo htmlspecialchars($booking['proof_path']); ?>" target="_blank">Lihat Gambar Penuh</a>
            </div>
          <?php endif; ?>
        </div>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</div>
</body>
</html>

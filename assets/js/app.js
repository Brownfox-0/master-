const inputBukti = document.getElementById("bukti");
const preview = document.getElementById("preview");
const uploadStatus = document.getElementById("uploadStatus");
const bookingBtn = document.getElementById("bookingBtn");
const jenisSelect = document.getElementById("jenis");
const serviceNote = document.getElementById("serviceNote");
const kabupatenSelect = document.getElementById("kabupaten");
const kecamatanSelect = document.getElementById("kecamatan");
const alamatField = document.getElementById("alamat");
const patokanField = document.getElementById("patokan");
const cekAlamatBtn = document.getElementById("cekAlamatBtn");
const lokasiBtn = document.getElementById("lokasiBtn");
const locationStatus = document.getElementById("locationStatus");
const homeServiceValue = "Home Service - Rp100.000";
const regionsDataUrl = "assets/data/sumut-regions.json";

let sumutRegions = [];
let locationValidation = {
  checked: false,
  allowed: false,
  lat: null,
  lng: null,
  travelTimeSeconds: null,
  travelTimeText: "",
  distanceMeters: null,
  detectedAddress: "",
  addressNeedsCompletion: false,
  source: ""
};

function resetLocationValidation() {
  locationValidation = {
    checked: false,
    allowed: false,
    lat: null,
    lng: null,
    travelTimeSeconds: null,
    travelTimeText: "",
    distanceMeters: null,
    detectedAddress: "",
    addressNeedsCompletion: false,
    source: ""
  };

  locationStatus.textContent = "";
  locationStatus.className = "location-status";
  lokasiBtn.disabled = false;
  cekAlamatBtn.disabled = false;
  lokasiBtn.textContent = "Gunakan Lokasi Saya";
  cekAlamatBtn.textContent = "Cek Alamat Saya";
}

function resetUploadStatus() {
  uploadStatus.textContent = "";
  uploadStatus.className = "upload-status";
}

function setUploadStatus(message, type) {
  uploadStatus.textContent = message;
  uploadStatus.className = "upload-status show" + (type ? " " + type : "");
}

function invalidateManualCheck() {
  if (locationValidation.checked && locationValidation.source === "manual-address") {
    resetLocationValidation();
    setLocationStatus("Alamat diubah. Silakan klik 'Cek Alamat Saya' lagi untuk memperbarui estimasi waktu tempuh.", false);
  }
}

function setLocationStatus(message, isError) {
  locationStatus.textContent = message;
  locationStatus.className = "location-status show" + (isError ? " error" : "");
}

function formatTravelTime(seconds) {
  const totalMinutes = Math.ceil(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return hours + " jam " + minutes + " menit";
  }

  if (hours > 0) {
    return hours + " jam";
  }

  return totalMinutes + " menit";
}

function populateSelect(selectElement, placeholder, items) {
  selectElement.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  selectElement.appendChild(placeholderOption);

  items.forEach(function(item) {
    const option = document.createElement("option");
    option.value = item.code;
    option.textContent = item.name;
    selectElement.appendChild(option);
  });
}

async function loadKabupatenOptions() {
  try {
    const response = await fetch(regionsDataUrl + "?v=1");
    sumutRegions = await response.json();
    populateSelect(kabupatenSelect, "Pilih Kabupaten/Kota di Sumatera Utara", sumutRegions);
  } catch (error) {
    setLocationStatus("Daftar kabupaten/kota Sumatera Utara belum berhasil dimuat. Coba refresh halaman.", true);
  }
}

function loadKecamatanOptions(regencyId) {
  kecamatanSelect.disabled = true;

  if (regencyId === "") {
    populateSelect(kecamatanSelect, "Pilih Kecamatan", []);
    kecamatanSelect.disabled = false;
    return;
  }

  const selectedRegency = sumutRegions.find(function(region) {
    return region.code === regencyId;
  });

  const districts = selectedRegency?.districts || [];
  populateSelect(kecamatanSelect, "Pilih Kecamatan", districts);
  kecamatanSelect.disabled = false;
}

function getSelectedOptionText(selectElement) {
  return selectElement.options[selectElement.selectedIndex]?.text || "";
}

function buildManualAddress() {
  const detailAlamat = alamatField.value.trim();
  const kecamatanName = getSelectedOptionText(kecamatanSelect);
  const kabupatenName = getSelectedOptionText(kabupatenSelect);

  const parts = [detailAlamat];

  if (kecamatanSelect.value !== "") {
    parts.push(kecamatanName);
  }

  if (kabupatenSelect.value !== "") {
    parts.push(kabupatenName);
  }

  parts.push("Sumatera Utara");

  return parts.filter(Boolean).join(", ");
}

async function validateTravelTime(payload) {
  const response = await fetch("check-travel-time.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Gagal memeriksa waktu tempuh Home Service.");
  }

  return result;
}

async function uploadBookingProof(data) {
  const formData = new FormData();
  Object.entries(data).forEach(function(entry) {
    const key = entry[0];
    const value = entry[1];
    if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });

  const response = await fetch("upload-proof.php", {
    method: "POST",
    body: formData
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Bukti transfer gagal disimpan.");
  }

  return result;
}

function applyValidationResult(result, source) {
  locationValidation = {
    checked: true,
    allowed: result.allowed,
    lat: result.destination?.latitude ?? null,
    lng: result.destination?.longitude ?? null,
    travelTimeSeconds: result.travel_time_seconds,
    travelTimeText: result.travel_time_text || formatTravelTime(result.travel_time_seconds),
    distanceMeters: result.distance_meters,
    detectedAddress: result.detected_address || alamatField.value.trim(),
    addressNeedsCompletion: Boolean(result.address_needs_completion),
    source: source
  };

  if (source === "device-location" && locationValidation.detectedAddress !== "") {
    alamatField.value = locationValidation.detectedAddress;
  }

  const addressHint = locationValidation.addressNeedsCompletion
    ? " Alamat terdeteksi masih umum, silakan lengkapi nomor rumah atau patokan terdekat."
    : "";

  if (result.allowed) {
    setLocationStatus(
      "Home Service tersedia. Estimasi waktu tempuh dari Brothers Barbershop: " +
      locationValidation.travelTimeText + "." + addressHint,
      false
    );
  } else {
    setLocationStatus(
      "Home Service belum tersedia untuk lokasi ini. Estimasi waktu tempuh dari Brothers Barbershop: " +
      locationValidation.travelTimeText + ", melebihi batas maksimal 1 jam." + addressHint,
      true
    );
  }
}

function requestLocation() {
  if (!navigator.geolocation) {
    setLocationStatus("Browser ini tidak mendukung akses lokasi.", true);
    return;
  }

  resetLocationValidation();
  lokasiBtn.disabled = true;
  cekAlamatBtn.disabled = true;
  lokasiBtn.textContent = "Memeriksa Lokasi...";
  setLocationStatus("Sedang mengambil lokasi dan menghitung waktu tempuh dari Brothers Barbershop...", false);

  navigator.geolocation.getCurrentPosition(
    async function(position) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      try {
        const result = await validateTravelTime({
          latitude: latitude,
          longitude: longitude
        });
        applyValidationResult(result, "device-location");
      } catch (error) {
        resetLocationValidation();
        setLocationStatus(error.message, true);
      } finally {
        lokasiBtn.disabled = false;
        cekAlamatBtn.disabled = false;
        lokasiBtn.textContent = "Gunakan Lokasi Saya";
      }
    },
    function(error) {
      const messages = {
        1: "Izin lokasi ditolak. Aktifkan izin lokasi untuk memeriksa Home Service.",
        2: "Lokasi tidak berhasil didapatkan. Coba lagi.",
        3: "Pengambilan lokasi terlalu lama. Coba lagi."
      };

      resetLocationValidation();
      setLocationStatus(messages[error.code] || "Terjadi kendala saat mengambil lokasi.", true);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

async function checkManualAddress() {
  const detailAlamat = alamatField.value.trim();

  if (kabupatenSelect.value === "") {
    alert("Pilih kabupaten/kota terlebih dahulu.");
    kabupatenSelect.focus();
    return;
  }

  if (kecamatanSelect.value === "") {
    alert("Pilih kecamatan terlebih dahulu.");
    kecamatanSelect.focus();
    return;
  }

  if (detailAlamat === "") {
    alert("Masukkan detail alamat atau patokan terlebih dahulu.");
    alamatField.focus();
    return;
  }

  const manualAddress = buildManualAddress();

  resetLocationValidation();
  cekAlamatBtn.disabled = true;
  lokasiBtn.disabled = true;
  cekAlamatBtn.textContent = "Memeriksa Alamat...";
  setLocationStatus("Sedang mencari alamat dan menghitung waktu tempuh dari Brothers Barbershop...", false);

  try {
    const result = await validateTravelTime({
      address: manualAddress
    });
    applyValidationResult(result, "manual-address");
  } catch (error) {
    resetLocationValidation();
    setLocationStatus(error.message, true);
  } finally {
    cekAlamatBtn.disabled = false;
    lokasiBtn.disabled = false;
    cekAlamatBtn.textContent = "Cek Alamat Saya";
  }
}

function toggleServiceNote() {
  const isHomeService = jenisSelect.value === homeServiceValue;
  serviceNote.classList.toggle("show", isHomeService);
  kabupatenSelect.classList.toggle("show", isHomeService);
  kecamatanSelect.classList.toggle("show", isHomeService);
  alamatField.classList.toggle("show", isHomeService);
  patokanField.classList.toggle("show", isHomeService);
  cekAlamatBtn.classList.toggle("show", isHomeService);
  lokasiBtn.classList.toggle("show", isHomeService);
  locationStatus.classList.toggle("show", isHomeService && locationStatus.textContent !== "");

  if (!isHomeService) {
    kabupatenSelect.value = "";
    populateSelect(kecamatanSelect, "Pilih Kecamatan", []);
    alamatField.value = "";
    patokanField.value = "";
    resetLocationValidation();
  }
}

jenisSelect.addEventListener("change", toggleServiceNote);
lokasiBtn.addEventListener("click", requestLocation);
cekAlamatBtn.addEventListener("click", checkManualAddress);
kabupatenSelect.addEventListener("change", function() {
  invalidateManualCheck();
  loadKecamatanOptions(kabupatenSelect.value);
});
kecamatanSelect.addEventListener("change", invalidateManualCheck);
alamatField.addEventListener("input", invalidateManualCheck);
patokanField.addEventListener("input", invalidateManualCheck);

populateSelect(kabupatenSelect, "Memuat kabupaten/kota...", []);
populateSelect(kecamatanSelect, "Pilih Kecamatan", []);
loadKabupatenOptions();
toggleServiceNote();
resetUploadStatus();

inputBukti.addEventListener("change", function() {
  const file = inputBukti.files[0];
  resetUploadStatus();

  if (file) {
    const reader = new FileReader();

    reader.onload = function(e) {
      preview.innerHTML = '<img src="' + e.target.result + '">';
      preview.classList.add("show");
    };

    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = "";
    preview.classList.remove("show");
  }
});

async function booking() {
  const nama = document.getElementById("nama").value.trim();
  const tanggal = document.getElementById("tanggal").value;
  const jam = document.getElementById("jam").value;
  const jenis = document.getElementById("jenis").value;
  const detailAlamat = alamatField.value.trim();
  const patokan = patokanField.value.trim();
  const pembayaran = document.getElementById("pembayaran").value;
  const bukti = inputBukti.files[0];
  const isHomeService = jenis === homeServiceValue;
  const manualAddress = buildManualAddress();

  if (nama === "" || tanggal === "" || jam === "" || jenis === "" || pembayaran === "" || !bukti) {
    alert("Lengkapi semua data terlebih dahulu!");
    return;
  }

  if (isHomeService && kabupatenSelect.value === "") {
    alert("Pilih kabupaten/kota untuk Home Service.");
    kabupatenSelect.focus();
    return;
  }

  if (isHomeService && kecamatanSelect.value === "") {
    alert("Pilih kecamatan untuk Home Service.");
    kecamatanSelect.focus();
    return;
  }

  if (isHomeService && detailAlamat === "") {
    alert("Masukkan detail alamat Home Service.");
    alamatField.focus();
    return;
  }

  if (isHomeService && patokan === "") {
    alert("Masukkan patokan rumah untuk memudahkan Home Service.");
    patokanField.focus();
    return;
  }

  if (isHomeService && !locationValidation.checked) {
    alert("Untuk Home Service, silakan klik 'Gunakan Lokasi Saya' atau 'Cek Alamat Saya' terlebih dahulu.");
    cekAlamatBtn.focus();
    return;
  }

  if (isHomeService && !locationValidation.allowed) {
    alert("Home Service hanya tersedia untuk lokasi dengan estimasi waktu tempuh maksimal 1 jam dari Brothers Barbershop.");
    cekAlamatBtn.focus();
    return;
  }

  try {
    bookingBtn.disabled = true;
    bookingBtn.textContent = "Menyimpan Booking...";
    setUploadStatus("Sedang menyimpan bukti transfer untuk admin...", "");

    const uploadResult = await uploadBookingProof({
      nama: nama,
      tanggal: tanggal,
      jam: jam,
      jenis: jenis,
      pembayaran: pembayaran,
      kabupaten: isHomeService ? getSelectedOptionText(kabupatenSelect) : "",
      kecamatan: isHomeService ? getSelectedOptionText(kecamatanSelect) : "",
      alamat: isHomeService ? manualAddress : "",
      patokan: isHomeService ? patokan : "",
      travel_time_text: isHomeService ? locationValidation.travelTimeText : "",
      validation_source: isHomeService ? (locationValidation.source === "manual-address" ? "Alamat Manual" : "Lokasi Perangkat") : "",
      latitude: locationValidation.lat ?? "",
      longitude: locationValidation.lng ?? "",
      bukti: bukti
    });

    setUploadStatus(
      "Bukti transfer berhasil disimpan untuk admin. ID Booking: " + uploadResult.booking_code + ".",
      "success"
    );

    const nomorWA = "6281120192814";
    const detailKabupaten = isHomeService ? "\nKabupaten/Kota: " + getSelectedOptionText(kabupatenSelect) : "";
    const detailKecamatan = isHomeService ? "\nKecamatan: " + getSelectedOptionText(kecamatanSelect) : "";
    const detailAlamatPesan = isHomeService ? "\nAlamat: " + manualAddress : "";
    const detailPatokan = isHomeService ? "\nPatokan Rumah: " + patokan : "";
    const detailLokasi = isHomeService && locationValidation.lat !== null && locationValidation.lng !== null
      ? "\nKoordinat Lokasi: " +
        locationValidation.lat.toFixed(5) + ", " +
        locationValidation.lng.toFixed(5)
      : "";
    const detailTravelTime = isHomeService
      ? "\nEstimasi Waktu Tempuh: " + locationValidation.travelTimeText
      : "";
    const detailSource = isHomeService && locationValidation.source !== ""
      ? "\nMetode Pengecekan: " + (locationValidation.source === "manual-address" ? "Alamat Manual" : "Lokasi Perangkat")
      : "";
    const detailBookingCode = "\nID Booking: " + uploadResult.booking_code;
    const pesan = encodeURIComponent(
      "Halo, saya " + nama + "\n\n" +
      "Saya ingin booking:\n" +
      "Tanggal: " + tanggal + "\n" +
      "Jam: " + jam + "\n" +
      "Jenis Pangkas: " + jenis +
      detailKabupaten +
      detailKecamatan +
      detailAlamatPesan +
      detailPatokan +
      detailLokasi +
      detailTravelTime +
      detailSource +
      detailBookingCode +
      "\nPembayaran: " + pembayaran + "\n\n" +
      "Bukti transfer sudah saya upload ke sistem admin."
    );

    window.open(
      "https://wa.me/" + nomorWA + "?text=" + pesan,
      "_blank"
    );
  } catch (error) {
    setUploadStatus(error.message, "error");
  } finally {
    bookingBtn.disabled = false;
    bookingBtn.textContent = "Booking Sekarang";
  }
}

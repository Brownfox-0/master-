const inputBukti = document.getElementById("bukti");
const preview = document.getElementById("preview");
const jenisSelect = document.getElementById("jenis");
const serviceNote = document.getElementById("serviceNote");
const alamatField = document.getElementById("alamat");
const lokasiBtn = document.getElementById("lokasiBtn");
const locationStatus = document.getElementById("locationStatus");
const homeServiceKeyword = "medan kota";
const medanKotaCenter = { lat: 3.5833, lng: 98.6833 };
const medanKotaRadiusKm = 2.5;

let locationValidation = {
  checked: false,
  insideArea: false,
  lat: null,
  lng: null
};

function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function isMedanKotaAddress(address) {
  return normalizeText(address).includes(homeServiceKeyword);
}

function toRadians(value) {
  return value * (Math.PI / 180);
}

function getDistanceInKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function resetLocationValidation() {
  locationValidation = {
    checked: false,
    insideArea: false,
    lat: null,
    lng: null
  };

  locationStatus.textContent = "";
  locationStatus.classList.remove("show", "error");
}

function setLocationStatus(message, isError) {
  locationStatus.textContent = message;
  locationStatus.classList.add("show");
  locationStatus.classList.toggle("error", Boolean(isError));
}

function requestLocation() {
  if (!navigator.geolocation) {
    setLocationStatus("Browser ini tidak mendukung akses lokasi.", true);
    return;
  }

  setLocationStatus("Sedang mengambil lokasi perangkat...", false);

  navigator.geolocation.getCurrentPosition(
    function(position) {
      const { latitude, longitude } = position.coords;
      const distance = getDistanceInKm(
        latitude,
        longitude,
        medanKotaCenter.lat,
        medanKotaCenter.lng
      );
      const insideArea = distance <= medanKotaRadiusKm;

      locationValidation = {
        checked: true,
        insideArea: insideArea,
        lat: latitude,
        lng: longitude
      };

      if (insideArea) {
        setLocationStatus(
          "Lokasi terdeteksi di area Home Service. Koordinat: " +
          latitude.toFixed(5) + ", " + longitude.toFixed(5),
          false
        );
      } else {
        setLocationStatus(
          "Lokasi perangkat terdeteksi di luar area Medan Kota. Home Service tidak bisa diproses.",
          true
        );
      }
    },
    function(error) {
      const messages = {
        1: "Izin lokasi ditolak. Aktifkan izin lokasi untuk Home Service.",
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

function toggleServiceNote() {
  const isHomeService = jenisSelect.value === "Home Service - Rp100.000";
  serviceNote.classList.toggle("show", isHomeService);
  alamatField.classList.toggle("show", isHomeService);
  lokasiBtn.classList.toggle("show", isHomeService);
  locationStatus.classList.toggle("show", isHomeService && locationStatus.textContent !== "");

  if (!isHomeService) {
    alamatField.value = "";
    resetLocationValidation();
  }
}

jenisSelect.addEventListener("change", toggleServiceNote);
lokasiBtn.addEventListener("click", requestLocation);
toggleServiceNote();

inputBukti.addEventListener("change", function(){
  const file = this.files[0];

  if(file){
    const reader = new FileReader();

    reader.onload = function(e){
      preview.innerHTML = '<img src="' + e.target.result + '">';
      preview.classList.add("show");
    };

    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = "";
    preview.classList.remove("show");
  }
});

function booking(){
  const nama = document.getElementById("nama").value.trim();
  const tanggal = document.getElementById("tanggal").value;
  const jam = document.getElementById("jam").value;
  const jenis = document.getElementById("jenis").value;
  const alamat = alamatField.value.trim();
  const pembayaran = document.getElementById("pembayaran").value;
  const bukti = inputBukti.files[0];
  const isHomeService = jenis === "Home Service - Rp100.000";

  if(nama === "" || tanggal === "" || jam === "" || jenis === "" || pembayaran === "" || !bukti){
    alert("Lengkapi semua data terlebih dahulu!");
    return;
  }

  if(isHomeService && alamat === ""){
    alert("Alamat Home Service wajib diisi.");
    alamatField.focus();
    return;
  }

  if(isHomeService && !isMedanKotaAddress(alamat)){
    alert("Home Service hanya tersedia untuk alamat di area Medan Kota. Mohon isi alamat yang mencantumkan Medan Kota.");
    alamatField.focus();
    return;
  }

  if(isHomeService && !locationValidation.checked){
    alert("Untuk Home Service, silakan klik 'Gunakan Lokasi Saya' terlebih dahulu.");
    lokasiBtn.focus();
    return;
  }

  if(isHomeService && !locationValidation.insideArea){
    alert("Lokasi perangkat berada di luar area Medan Kota, jadi Home Service belum bisa diproses.");
    lokasiBtn.focus();
    return;
  }

  const nomorWA = "6281120192814";
  const detailAlamat = isHomeService ? "\nAlamat: " + alamat : "";
  const detailLokasi = isHomeService
    ? "\nKoordinat Lokasi: " +
      locationValidation.lat.toFixed(5) + ", " +
      locationValidation.lng.toFixed(5)
    : "";
  const pesan = encodeURIComponent(
    "Halo, saya " + nama + "\n\n" +
    "Saya ingin booking:\n" +
    "Tanggal: " + tanggal + "\n" +
    "Jam: " + jam + "\n" +
    "Jenis Pangkas: " + jenis + "\n" +
    detailAlamat +
    detailLokasi +
    "\nPembayaran: " + pembayaran + "\n\n" +
    "Saya sudah transfer dan akan mengirim bukti pembayaran."
  );

  window.open(
    "https://wa.me/" + nomorWA + "?text=" + pesan,
    "_blank"
  );
}

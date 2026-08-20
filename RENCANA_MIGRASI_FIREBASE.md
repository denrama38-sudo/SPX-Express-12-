# RENCANA MIGRASI APLIKASI KE FIREBASE

## 1. Tujuan Utama

Mengubah sistem penyimpanan aplikasi dari:

HP -> Local Storage -> Backup JSON -> Google Drive

menjadi:

HP -> Firebase Authentication -> UID USER -> Firestore / Firebase Storage -> HP lain

Firebase menjadi sumber data utama (source of truth), sedangkan HP hanya menjadi perangkat untuk mengakses dan menggunakan data.

---

## 2. Masalah Sistem Sekarang

Dari source yang sudah diperiksa, data utama aplikasi mencakup:

- scans
- riwayat
- recycle
- cats (daftar toko)
- set (setting)

Data tersebut saat ini disimpan melalui localStorage dan fungsi save(). Backup JSON juga mengambil data tersebut untuk backup/restore.

Target migrasi: mempertahankan perilaku aplikasi sebisa mungkin, tetapi mengganti persistence utama menjadi Firebase.

---

## 3. Arsitektur Target

GOOGLE ACCOUNT
    |
    v
FIREBASE AUTHENTICATION
    |
    v
USER UID
    |
    v
FIRESTORE
    |-- profile
    |-- settings
    |-- stores
    |-- scans
    |-- history
    `-- recycle
    |
    v
FIREBASE STORAGE
    |
    `-- foto/file

Authentication menjawab "siapa user".
Firestore menyimpan data aplikasi.
Storage menyimpan foto/file.

---

## 4. Prinsip Source of Truth

Firebase adalah sumber data utama.

Bukan:

HP A = database utama
HP B = salinan

Melainkan:

HP A ---HP B ----> Firebase
HP C ---/

Semua perangkat dengan UID yang sama membaca data akun yang sama.

---

## 5. Identitas Data

Semua data akun dikaitkan dengan Firebase UID.

Jangan menggunakan:
- nama HP
- email sebagai primary key
- device ID sebagai pemilik data

Contoh:

Google Account
    -> Firebase Authentication
    -> UID = ABC123
    -> users/ABC123/...

---

## 6. Contoh HP A -> HP B

HP A:
- Login Google
- UID = ABC123
- Toko A = 125
- Toko B = 80
- Toko C = 210
- Sound = ON
- Vibrate = OFF
- Anti Duplicate = ON
- Perubahan disimpan ke Firebase
- Logout

HP B:
- Login Google yang sama
- Firebase menghasilkan UID ABC123
- Aplikasi mengambil data dari Firestore
- Data dan setting tampil seperti kondisi terakhir yang tersimpan

Tidak perlu melakukan backup/restore manual untuk perpindahan HP biasa.

---

## 7. Struktur Firestore yang Direncanakan

users
  /{uid}
    /profile
    /settings
      /config
    /stores
      /{storeId}
    /scans
      /{scanId}
    /history
      /{itemId}
    /recycle
      /{itemId}

Catatan: ini adalah rancangan target, bukan struktur yang sudah ada di source lama.

---

## 8. Profile

Konsep:

users/{uid}/profile

Kemungkinan field:
- uid
- name
- email
- photoURL
- createdAt
- updatedAt

Firebase Authentication UID tetap menjadi identitas utama.

---

## 9. Settings

Konsep:

users/{uid}/settings/config

Contoh:

sound: true
vibrate: false
antiDuplicate: true

Setting mengikuti akun, bukan HP.

---

## 10. Stores / Toko

Source lama memakai cats sebagai daftar toko.

Target:

users/{uid}/stores/{storeId}

Contoh:

storeId: st001
name: ACC
createdAt: ...
updatedAt: ...

Scan sebaiknya mereferensikan storeId, bukan hanya nama toko.

Alasannya: jika nama toko berubah, scan lama tetap menunjuk toko yang sama.

---

## 11. Scans

Target:

users/{uid}/scans/{scanId}

Contoh konsep:

id: SPX123456789
storeId: st001
storeName: ACC
timestamp: ...
createdAt: ...

Field final harus mengikuti struktur asli source setelah audit detail.

---

## 12. History

Target:

users/{uid}/history/{itemId}

Logika aplikasi lama sebisa mungkin dipertahankan.

---

## 13. Recycle

Target:

users/{uid}/recycle/{itemId}

Saat item dihapus dari data aktif, proses perpindahan harus aman.

---

## 14. Transaksi Perpindahan Data

Jangan melakukan:

hapus dari scans
-> lalu baru simpan history

tanpa mekanisme aman.

Risiko:
- scans berhasil dihapus
- koneksi putus
- history gagal disimpan
- data hilang

Untuk operasi tertentu gunakan Firestore transaction/batched write sesuai kebutuhan.

---

## 15. Anti Duplicate

Target:

SCAN
 -> normalisasi ID
 -> cek duplicate
 -> jika sudah ada: TOLAK
 -> jika belum: SIMPAN

Karena database berada di Firebase, Anti Duplicate dapat berlaku lintas perangkat pada akun yang sama.

Contoh:
HP A scan SPX123 -> tersimpan
HP B scan SPX123 -> duplicate

Jika dua HP scan ID yang sama hampir bersamaan, desain final harus mencegah race condition. Detail teknis ditentukan saat implementasi.

---

## 16. Google Login

Source lama sudah memiliki Google OAuth/login.

Target:

Google
 -> Firebase Authentication
 -> Firebase User
 -> UID
 -> Firestore

Google Drive OAuth tidak lagi menjadi fondasi database aplikasi.

---

## 17. Logout

Target:

LOGOUT
 -> hentikan listener Firebase
 -> bersihkan state aplikasi
 -> Firebase signOut()
 -> kembali ke halaman login

Data Firebase tidak dihapus saat logout.

---

## 18. Login di HP Baru

HP baru
 -> Login Google
 -> Firebase Auth
 -> UID lama
 -> Firestore
 -> load data
 -> render UI

---

## 19. Local Storage

Local Storage tidak harus dihapus total.

Masih boleh digunakan untuk:
- cache
- preferensi perangkat
- state UI sementara

Tetapi data utama akun tidak boleh bergantung pada localStorage.

Data utama:
- scans
- history
- recycle
- stores
- account settings

harus bersumber dari Firebase.

---

## 20. Backup JSON

Backup JSON tetap dipertahankan sebagai backup manual.

Export:
Firebase -> JSON

Import:
JSON -> validasi -> Firebase

Jadi JSON bukan lagi database utama.

---

## 21. Migrasi Backup Lama

Alur:

Login Google
 -> UID
 -> Import backup JSON
 -> validasi
 -> mapping data lama
 -> Firestore

Data lama tidak perlu dibuang.

Contoh:
cats -> stores
set -> settings
scans -> scans
riwayat -> history
recycle -> recycle

---

## 22. Foto / Galeri

Source aplikasi memiliki Photo dan Galeri serta fungsi terkait foto.

Namun mekanisme penyimpanan foto belum cukup terlihat dari bagian source yang sudah dipetakan.

Target yang direncanakan:

Foto
 -> Firebase Storage
 -> metadata/path/URL di Firestore

Struktur final foto harus ditentukan setelah audit source foto yang lengkap. Jangan mengarang struktur sebelum source tersebut diperiksa.

---

## 23. Security Rules

Wajib memastikan:

UID_A hanya boleh mengakses data UID_A.
UID_B hanya boleh mengakses data UID_B.

Security tidak boleh hanya dilakukan di UI.

Firestore Security Rules harus mengunci akses berdasarkan UID.

---

## 24. Realtime Sync

Target:

HP A -> Firestore -> listener -> HP B

Tidak semua data harus selalu dilisten secara agresif. Data mana yang realtime akan ditentukan saat implementasi.

---

## 25. Offline dan Konflik

Perlu menentukan:
- apakah scan boleh dilakukan offline
- kapan sinkronisasi dilakukan
- bagaimana konflik ditangani
- data mana yang menang

Jangan otomatis memakai last-write-wins untuk semua data.

Untuk jumlah paket dan operasi scan, strategi konflik harus mengikuti logika bisnis aplikasi.

---

## 26. Mengapa Tidak Satu JSON Besar di Firestore

Secara teknis bisa menyimpan semua data dalam satu dokumen, tetapi desain utama yang dipilih adalah collection/document terpisah.

Keuntungan:
- perubahan lebih kecil
- lebih cocok multi-device
- operasi individual lebih mudah
- Anti Duplicate lebih mudah
- transaksi lebih terkontrol
- pertumbuhan data lebih baik

---

## 27. Lapisan Data

Daripada setiap fungsi UI langsung mengakses Firestore, buat data layer.

Contoh fungsi:

- loadUserData()
- saveSettings()
- addStore()
- updateStore()
- deleteStore()
- addScan()
- moveToHistory()
- moveToRecycle()
- restoreRecycle()
- deleteHistory()
- loadPhotos()

Nama final fungsi mengikuti source asli agar integrasinya rapi.

---

## 28. Fungsi save()

Sekarang konsepnya:

perubahan data -> save() -> localStorage

Target:

perubahan data -> data layer -> Firestore

Jangan membuat save() yang selalu meng-upload seluruh database.

Lebih baik operasi spesifik:
- saveSettings()
- addStore()
- updateStore()
- addScan()
- moveToHistory()
- moveToRecycle()
- restoreItem()

---

# ROADMAP IMPLEMENTASI

## PHASE 0 - Audit Source

Petakan:
- variable
- fungsi
- UI
- localStorage
- backup
- restore
- login
- logout
- scan
- foto
- galeri

Khusus foto masih perlu audit lebih lanjut.

## PHASE 1 - Firebase Project

Siapkan:
- Firebase Project
- Firebase Authentication
- Google Provider
- Firestore
- Storage

## PHASE 2 - Firebase Authentication

Ganti fondasi Google OAuth lama menjadi Firebase Authentication + Google.

Target:
Google -> Firebase Auth -> UID

## PHASE 3 - Firebase Data Layer

Buat modul untuk:
- initialize Firebase
- authentication
- Firestore
- Storage

Buat fungsi CRUD yang dibutuhkan aplikasi.

## PHASE 4 - Scans

Pindahkan persistence scans dari localStorage ke Firestore tanpa merusak UI dan algoritma scan.

## PHASE 5 - Stores

Migrasikan cats menjadi stores dengan storeId.

## PHASE 6 - History

Migrasikan riwayat menjadi history.

## PHASE 7 - Recycle

Migrasikan recycle dan gunakan transaksi/batch bila diperlukan.

## PHASE 8 - Settings

Migrasikan set menjadi settings/config.

## PHASE 9 - Anti Duplicate

Pastikan duplicate detection bekerja lintas perangkat dan aman terhadap race condition.

## PHASE 10 - Realtime Sync

Tambahkan listener untuk data yang memang perlu realtime.

## PHASE 11 - Foto

Audit source foto lengkap, kemudian pindahkan file ke Storage dan metadata ke Firestore.

## PHASE 12 - Backup JSON

Pertahankan Export dan Import.

## PHASE 13 - Migration Tool

Buat import backup lama ke struktur Firebase baru.

## PHASE 14 - Security Rules

Pastikan user hanya dapat mengakses data milik UID sendiri.

## PHASE 15 - Testing

Minimal test:
1. Login HP A
2. Tambah toko
3. Scan
4. Ubah setting
5. Logout
6. Login HP B
7. Pastikan data muncul
8. Ubah setting HP B
9. Login kembali HP A
10. Pastikan perubahan muncul
11. Scan ID yang sama dari HP berbeda
12. Pastikan duplicate ditolak
13. Delete -> Recycle
14. Restore
15. Export JSON
16. Import JSON
17. Test internet putus
18. Test user berbeda
19. Pastikan user berbeda tidak dapat melihat data
20. Test foto/galeri

---

# CHECKPOINT SEBELUM CODING

Yang sudah disepakati:

[✓] Google Login
[✓] Firebase Authentication
[✓] UID sebagai identitas user
[✓] Firestore sebagai database utama
[✓] Storage untuk foto/file
[✓] Data mengikuti akun, bukan HP
[✓] Toko ikut akun
[✓] Scan ikut akun
[✓] History ikut akun
[✓] Recycle ikut akun
[✓] Setting ikut akun
[✓] Anti Duplicate lintas perangkat
[✓] Backup JSON tetap ada
[✓] Import JSON tetap ada
[✓] Security Rules berdasarkan UID
[✓] Realtime sync direncanakan
[✓] Migrasi data lama direncanakan
[✓] UI existing sebisa mungkin dipertahankan
[✓] Tidak rewrite aplikasi dari nol

[!] Detail penyimpanan foto masih perlu audit source
[!] Detail konflik dua HP perlu ditentukan dari logika scan
[!] Nama field Firestore final mengikuti audit source lengkap

---

# ATURAN KERJA SAAT MULAI CODING

1. Jangan rewrite aplikasi dari nol.
2. Jangan menghapus fitur lama tanpa alasan.
3. Jangan langsung menghapus localStorage.
4. Firebase menjadi source of truth setelah migrasi stabil.
5. UID menjadi pemilik data.
6. UI existing dipertahankan sebisa mungkin.
7. Struktur data lama dipetakan sebelum diubah.
8. Jangan mengarang field yang belum terlihat dari source.
9. Setiap perubahan kode dijelaskan file dan fungsinya.
10. Setelah setiap tahap dilakukan testing.
11. Security Rules dibuat sebelum sistem dianggap selesai.
12. Backup JSON tetap dipertahankan.
13. Foto baru dipindahkan setelah mekanisme foto lama diaudit.
14. Anti Duplicate harus memperhitungkan multi-device dan race condition.
15. Operasi perpindahan data harus aman dari kehilangan data.

---

# HASIL AKHIR

Target pengalaman user:

INSTALL APP
 -> LOGIN GOOGLE
 -> DATA AKUN MUNCUL
 -> PAKAI APLIKASI
 -> SEMUA PERUBAHAN TERSINKRON
 -> LOGOUT

HP BARU
 -> LOGIN GOOGLE YANG SAMA
 -> DATA DAN SETTING TERAKHIR MUNCUL

Tidak perlu backup/restore manual hanya untuk berpindah HP.


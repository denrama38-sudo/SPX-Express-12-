# SPX EXPRESS 12 — MASTER BLUEPRINT MIGRASI FIREBASE
## Rangkuman dari awal sampai Phase 1, sebelum masuk Phase berikutnya

Dokumen ini adalah acuan utama proyek. Tujuannya supaya sebelum coding berikutnya kita punya satu "peta" yang jelas: kondisi aplikasi sekarang, target Firebase, alasan setiap perubahan, urutan migrasi, apa yang sudah dibuat, apa yang BELUM boleh disentuh, dan bagaimana cara testing.

============================================================
1. TUJUAN BESAR
============================================================

Target utama aplikasi:

HP A
  ↓
Login Google
  ↓
Firebase Authentication
  ↓
UID akun
  ↓
Firestore / Storage
  ↓
data + setting tersimpan

Logout HP A

HP B
  ↓
Login Google yang sama
  ↓
Firebase Authentication
  ↓
UID yang sama
  ↓
Firestore mengambil data terakhir
  ↓
data + setting muncul kembali

Artinya:

HP B tidak melakukan restore backup dari HP A.

Firebase menjadi sumber data utama (source of truth).

HP hanya menjadi perangkat/client yang mengakses data milik akun.

============================================================
2. CONTOH KONDISI YANG DIINGINKAN
============================================================

Misalnya HP A terakhir berisi:

TOKO A = 125 paket
TOKO B = 80 paket
TOKO C = 210 paket

Setting:

Sound = ON
Vibrate = OFF
Anti Duplicate = ON

Setelah logout.

Kemudian akun Google yang sama login di HP B.

Hasil yang diharapkan:

TOKO A = 125 paket
TOKO B = 80 paket
TOKO C = 210 paket

Sound = ON
Vibrate = OFF
Anti Duplicate = ON

Persis kondisi terakhir yang memang sudah tersimpan di Firebase.

============================================================
3. PEMBAGIAN FUNGSI FIREBASE
============================================================

Firebase Authentication
-----------------------
Fungsi:
- menentukan siapa user yang login
- memberikan Firebase UID
- mempertahankan identitas akun

Firestore
---------
Fungsi:
- menyimpan data aplikasi
- menyimpan data toko
- menyimpan scan
- menyimpan history
- menyimpan recycle
- menyimpan settings
- menyimpan metadata foto/file

Firebase Storage
----------------
Fungsi:
- menyimpan file/foto berukuran besar

Jadi jangan mencampur fungsi:

Authentication bukan database scan.
Firestore bukan tempat utama menyimpan binary foto.
Storage bukan tempat menentukan siapa user.

============================================================
4. ARSITEKTUR TARGET
============================================================

Google Account
      ↓
Firebase Authentication
      ↓
Firebase UID
      ↓
users/{uid}
      ├── profile
      ├── settings
      │     └── config
      ├── stores
      │     └── {storeId}
      ├── scans
      │     └── {scanId}
      ├── history
      │     └── {itemId}
      └── recycle
            └── {itemId}

Foto:
Firebase Storage
      ↓
metadata/reference
      ↓
Firestore

Prinsip utama:
semua data akun berada di bawah UID.

============================================================
5. KONDISI SOURCE APLIKASI SAAT INI
============================================================

Source asli adalah index.html aplikasi "SPX Express 12".

Di source saat ini, persistence utama masih memakai localStorage.

Fungsi save() menyimpan:
- scans -> localStorage "sn1"
- recycle -> localStorage "sn2"
- cats -> localStorage "sn3"
- set -> localStorage "sn4"
- riwayat -> localStorage "sn5"

save() kemudian memanggil stat().

Jadi sebelum migrasi:
HP adalah tempat data utama berada.

Itu berbeda dengan target Firebase.

============================================================
6. ARTI KEY DATA LAMA
============================================================

Dari source yang dipetakan:

sn1 = scans
sn2 = recycle
sn3 = cats / daftar toko
sn4 = set / settings
sn5 = riwayat / history

Nama internal ini tidak boleh langsung dibuang.

Kita akan membuat mapping:

cats
  ↓
stores

set
  ↓
settings/config

scans
  ↓
scans

riwayat
  ↓
history

recycle
  ↓
recycle

Mapping final field tetap harus mempertahankan struktur data lama selama tidak ada alasan kuat untuk mengubahnya.

============================================================
7. GOOGLE LOGIN LAMA
============================================================

Aplikasi saat ini memiliki mekanisme Google OAuth lama.

Source menggunakan Google Identity Services OAuth token client dengan scope termasuk:
- Google Drive file
- user profile
- user email

Token/session lama juga memakai localStorage untuk sebagian state login.

Sistem ini berkaitan dengan backup Google Drive.

Target migrasi:

Google Account
  ↓
Firebase Authentication
  ↓
Firebase UID

Google Drive tidak lagi menjadi database utama.

PENTING:
Google Drive tidak langsung dihapus pada awal migrasi.

Kita pertahankan dulu sampai Firebase terbukti stabil.

============================================================
8. BACKUP JSON LAMA
============================================================

Backup JSON tetap dipertahankan.

Konsep lama:
data aplikasi
  ↓
JSON
  ↓
Google Drive

Konsep target:
Firestore
  ↓
Export JSON jika user menginginkan backup manual

Dan:
JSON backup lama
  ↓
validasi
  ↓
mapping
  ↓
Firestore

Jadi JSON tetap berguna sebagai:
- backup manual
- migrasi data lama
- recovery

Tetapi JSON bukan lagi source of truth harian.

============================================================
9. FOTO / GALERI
============================================================

Ini bagian penting.

Source tidak menyimpan foto utama di localStorage.

Source menggunakan IndexedDB dengan database:
ScanNotePhotoDB

Artinya sistem foto sekarang:

kamera
  ↓
data foto
  ↓
IndexedDB
  ↓
galeri

Target:

kamera
  ↓
foto
  ↓
Firebase Storage
  ↓
metadata/reference
  ↓
Firestore
  ↓
galeri

Migrasi foto TIDAK dilakukan bersamaan dengan Phase 1 Authentication.

Kita audit struktur foto terlebih dahulu agar tidak merusak:
- watermark
- metadata
- tanggal
- lokasi
- galeri
- delete
- download
- share
- multi-select

============================================================
10. SOURCE OF TRUTH
============================================================

Sebelum:
HP A = sumber data
HP B = sumber data berbeda

Sesudah:
Firebase = sumber data utama

HP A ──┐
HP B ──┼──> Firebase
HP C ──┘

Semua perangkat membaca akun yang sama berdasarkan UID.

============================================================
11. IDENTITAS USER
============================================================

Jangan memakai:
- nama HP
- device ID
- nama tampilan
- email sebagai primary key

Gunakan:

Firebase Authentication UID

Contoh:

Google account
  ↓
Firebase
  ↓
UID = ABC123
  ↓
users/ABC123/...

Email boleh disimpan sebagai informasi profile, tetapi UID menjadi identitas keamanan utama.

============================================================
12. STRUKTUR FIRESTORE TARGET
============================================================

users/{uid}/profile/main

Contoh:
uid
name
email
photoURL
updatedAt

--------------------------------

users/{uid}/settings/config

Contoh:
sound
vibrate
anti
updatedAt

--------------------------------

users/{uid}/stores/{storeId}

Contoh:
name
createdAt
updatedAt

--------------------------------

users/{uid}/scans/{scanId}

Field final mengikuti struktur scan asli.

--------------------------------

users/{uid}/history/{itemId}

Field final mengikuti struktur riwayat asli.

--------------------------------

users/{uid}/recycle/{itemId}

Field final mengikuti struktur recycle asli.

============================================================
13. KENAPA STORE MENGGUNAKAN storeId
============================================================

Jangan hanya menyimpan nama toko sebagai identitas.

Contoh:

storeId = st001
name = TOKO A

Scan:
storeId = st001

Jika nama toko berubah:
TOKO A -> TOKO A BARU

scan lama tetap menunjuk toko yang sama.

Nama toko boleh menjadi snapshot/display field bila diperlukan, tetapi ID stabil tetap penting.

============================================================
14. ANTI DUPLICATE
============================================================

Target:

Scan ID
  ↓
normalisasi
  ↓
cek database Firebase
  ↓
sudah ada?
  ├── ya  -> duplicate
  └── tidak -> simpan

Keuntungan:
Anti Duplicate dapat berlaku lintas perangkat.

Contoh:

HP A scan:
SPX123

Firebase:
SPX123 tersimpan

HP B scan:
SPX123

Firebase:
duplicate

PENTING:
Jika HP A dan HP B melakukan scan ID yang sama hampir bersamaan, kita tidak boleh hanya mengandalkan:
"cek dulu lalu insert"

Karena bisa terjadi race condition:

HP A cek -> belum ada
HP B cek -> belum ada
HP A insert
HP B insert

Solusi final perlu memakai desain document ID / transaction / operasi atomik yang sesuai.

Anti Duplicate belum dianggap selesai di Phase 1.

============================================================
15. OPERASI SCAN -> HISTORY / RECYCLE
============================================================

Jangan melakukan:

hapus scans
  ↓
baru simpan history

karena jika koneksi putus di tengah:
scan bisa hilang tetapi history gagal tersimpan.

Untuk operasi perpindahan data yang membutuhkan konsistensi, nanti gunakan batch/transaction sesuai kasus.

Tujuannya:
tidak ada keadaan "data setengah pindah".

============================================================
16. LOCALSTORAGE SETELAH FIREBASE
============================================================

LocalStorage tidak harus dihapus total.

Masih boleh untuk:
- cache
- UI state
- state perangkat
- aktivasi device
- hal yang memang khusus perangkat

Tetapi data akun utama tidak boleh bergantung pada localStorage.

Data akun utama:
- scans
- history
- recycle
- stores
- settings

harus bersumber dari Firebase setelah migrasi selesai.

============================================================
17. LOGOUT
============================================================

Target:

Logout
  ↓
hentikan listener Firebase
  ↓
bersihkan state aplikasi
  ↓
Firebase signOut()
  ↓
kembali ke login

Logout tidak boleh menghapus data Firebase.

============================================================
18. LOGIN HP BARU
============================================================

HP baru:
1. aplikasi dibuka
2. aktivasi device jika mekanisme device lock masih dipertahankan
3. login Google
4. Firebase Authentication membuat session
5. UID didapat
6. aplikasi mengambil data Firestore UID tersebut
7. UI dirender

Tidak ada:
"restore backup HP lama"

============================================================
19. SECURITY RULES
============================================================

Target aturan:

User A hanya boleh membaca/menulis:
users/UID_A/*

User A tidak boleh:
users/UID_B/*

Keamanan tidak cukup hanya dengan menyembunyikan tombol di UI.

Firestore Security Rules wajib mengunci akses berdasarkan:
request.auth.uid

Rules awal yang dibuat untuk Phase 1 menggunakan prinsip ini.

============================================================
20. PHASE 1 YANG SUDAH DIBUAT
============================================================

Paket kode:

SPX_FIREBASE_PHASE1_CODE.zip

Isi:

firebase.js
firebase-data.js
firestore.rules
INTEGRATION_PHASE1.md
README_PHASE1.md

Tujuan Phase 1:
1. Firebase App initialization
2. Firebase Authentication
3. Google Sign-In
4. Firebase UID
5. profile dasar user
6. Security Rules berdasarkan UID
7. skeleton Firestore data layer

============================================================
21. firebase.js
============================================================

File ini menangani fondasi Firebase:

- initializeApp()
- getAuth()
- GoogleAuthProvider
- signInWithRedirect()
- getRedirectResult()
- signOut()
- onAuthStateChanged()
- getFirestore()

Saat login:
Firebase Authentication memberikan user.

Kemudian:
ensureUserProfile()

menulis/memperbarui:

users/{uid}/profile/main

Profile berisi informasi dasar:
- uid
- displayName
- email
- photoURL
- updatedAt

File juga menyediakan:

window.spxFirebase

dengan:
- app
- auth
- db
- currentUser
- authReady
- getUid()
- requireUser()

Tujuannya agar kode aplikasi berikutnya dapat mengakses Firebase melalui satu pintu.

============================================================
22. firebase-data.js
============================================================

Ini adalah skeleton data layer.

Fungsi yang sudah disiapkan:

loadSettings()
saveSettings()

loadStores()
addStore()
updateStore()
deleteStore()

addScan()

loadAllAccountData()

PENTING:
Ini belum berarti seluruh aplikasi sudah pindah ke Firebase.

File ini adalah fondasi untuk Phase berikutnya.

============================================================
23. firestore.rules
============================================================

Prinsip:

request.auth != null
dan
request.auth.uid == uid

Dengan demikian user hanya bisa mengakses folder users miliknya.

Ada default deny untuk dokumen lain.

Rules ini masih perlu diperketat lagi ketika struktur dan kebutuhan query final sudah diketahui.

============================================================
24. KENAPA KITA BELUM MENGUBAH save()
============================================================

Karena source sekarang memakai save() sebagai pusat penyimpanan localStorage.

Kalau langsung diganti:

save()
  ↓
Firebase

tanpa audit semua pemanggil save(), risiko:
- data hilang
- UI tidak sinkron
- object lama berubah bentuk
- recycle/history rusak
- backup lama rusak
- foto tidak ikut
- duplicate logic tidak konsisten

Jadi strategi aman:

Phase 1:
Authentication

Phase 2:
data layer + settings/stores/scans

Phase 3:
history/recycle + transaction

Phase 4:
realtime + anti duplicate lintas perangkat

Phase 5:
foto Storage

Phase 6:
backup/migrasi + hapus ketergantungan Drive

============================================================
25. GOOGLE DRIVE TIDAK LANGSUNG DIHAPUS
============================================================

Selama migrasi:

Firebase = sistem baru
Google Drive = sistem lama/fallback

Setelah:
- login Firebase stabil
- data Firestore stabil
- multi-device stabil
- backup JSON stabil
- foto stabil

barulah Google Drive lama bisa dicabut.

============================================================
26. DATA MIGRATION
============================================================

Data lama:

sn1
sn2
sn3
sn4
sn5

akan dipetakan.

Contoh:

sn1 scans
   ↓
users/{uid}/scans

sn2 recycle
   ↓
users/{uid}/recycle

sn3 cats
   ↓
users/{uid}/stores

sn4 set
   ↓
users/{uid}/settings/config

sn5 riwayat
   ↓
users/{uid}/history

Tidak boleh langsung melakukan migrasi tanpa validasi.

Langkah migrasi:
1. baca data lama
2. validasi JSON/object
3. normalisasi field
4. buat UID target
5. tulis ke Firestore
6. verifikasi jumlah data
7. baru anggap migrasi sukses

============================================================
27. REALTIME SYNC
============================================================

Target:

HP A
  ↓
Firestore
  ↓
listener
  ↓
HP B

Tetapi tidak semua data harus dipaksa realtime.

Kita pilih:
- data yang perlu live
- data yang cukup load saat page dibuka
- data yang cukup refresh manual

Tujuannya:
hemat bandwidth, biaya, dan kompleksitas.

============================================================
28. OFFLINE
============================================================

Hal yang perlu ditentukan:

Apakah scan boleh dilakukan tanpa internet?

Jika boleh:
- bagaimana antrean offline?
- kapan dikirim?
- bagaimana duplicate?
- bagaimana konflik?

Jangan menggunakan aturan "last write wins" secara membabi buta untuk semua data.

Khusus scan dan jumlah paket, strategi harus mengikuti aturan bisnis aplikasi.

============================================================
29. TEST MULTI-DEVICE
============================================================

Test wajib:

TEST A
HP A:
- login
- lihat UID
- tambah toko
- scan
- ubah settings
- logout

TEST B
HP B:
- login akun Google sama
- lihat UID
- load data
- pastikan toko sama
- pastikan scan sama
- pastikan setting sama

TEST C
HP B:
- ubah setting
- tambah data

HP A:
- buka/reload/listener
- pastikan perubahan muncul

TEST D
- scan ID yang sama dari dua perangkat
- pastikan aturan duplicate bekerja

TEST E
- logout
- pastikan data Firebase tidak terhapus

TEST F
- akun Google berbeda
- pastikan tidak bisa melihat data user lain

============================================================
30. STATUS SEKARANG
============================================================

SUDAH:
[✓] konsep Firebase
[✓] source of truth = Firebase
[✓] Firebase Authentication
[✓] Google Sign-In target
[✓] UID
[✓] profile dasar
[✓] Firestore target structure
[✓] Security Rules dasar
[✓] Phase 1 code skeleton
[✓] data layer skeleton

BELUM:
[ ] Firebase config asli dimasukkan
[ ] Google provider diaktifkan
[ ] Firestore dibuat di Firebase Console
[ ] Authentication diuji di HP A
[ ] Authentication diuji di HP B
[ ] settings dipindahkan penuh
[ ] stores/cats dipindahkan
[ ] scans dipindahkan
[ ] history dipindahkan
[ ] recycle dipindahkan
[ ] Anti Duplicate final
[ ] realtime sync final
[ ] offline strategy
[ ] foto -> Storage
[ ] migrasi backup lama
[ ] Google Drive dicabut

============================================================
31. HAL YANG JANGAN DILAKUKAN SEKARANG
============================================================

Jangan:
1. menghapus localStorage
2. menghapus Google Drive
3. mengganti save() total
4. mengubah struktur scan tanpa mapping
5. mengubah struktur foto tanpa audit
6. mengaktifkan Anti Duplicate final sebelum ID strategy ditentukan
7. membuka Firestore dengan allow read/write true
8. menyimpan password Google
9. menjadikan email sebagai primary key
10. membuat satu JSON raksasa sebagai satu-satunya dokumen Firestore

============================================================
32. URUTAN PHASE BERIKUTNYA
============================================================

PHASE 1
Firebase Authentication
Status:
KODE DASAR SUDAH DIBUAT.

PHASE 1A
Integrasi ke index.html asli
- pasang firebase.js
- pasang firebase-data.js
- sambungkan tombol login
- sambungkan logout
- test UID
- test profile

PHASE 2
Settings + Stores
- set -> settings/config
- cats -> stores
- UI tetap
- data layer mulai aktif

PHASE 3
Scans
- mapping object scan
- document ID
- timestamp
- storeId
- duplicate strategy awal

PHASE 4
History + Recycle
- perpindahan aman
- batch/transaction
- restore
- delete

PHASE 5
Multi-device + Realtime
- listeners
- update UI
- conflict handling

PHASE 6
Anti Duplicate lintas perangkat
- normalisasi ID
- document ID/transaction
- race-condition protection

PHASE 7
Foto
- audit IndexedDB
- upload Storage
- metadata Firestore
- galeri
- delete
- download/share

PHASE 8
Backup + Migration
- export Firestore -> JSON
- import JSON -> Firestore
- migrasi backup lama

PHASE 9
Pembersihan sistem lama
- hapus ketergantungan Drive
- localStorage data utama tidak lagi source of truth
- final security rules
- final testing

============================================================
33. ATURAN KERJA CODING
============================================================

Setiap phase:

1. audit source
2. tentukan mapping
3. buat kode kecil
4. integrasikan
5. test
6. perbaiki error
7. baru lanjut

Jangan melakukan rewrite besar sekaligus.

UI existing sebisa mungkin dipertahankan.

Jika sebuah field belum terlihat jelas dari source, jangan mengarang.

============================================================
34. HASIL AKHIR YANG DITUJU
============================================================

Pengalaman user:

INSTALL
 ↓
AKTIVASI
 ↓
LOGIN GOOGLE
 ↓
FIREBASE AUTH
 ↓
UID
 ↓
LOAD FIRESTORE
 ↓
DATA + SETTINGS
 ↓
SCAN / TOKO / HISTORY / RECYCLE
 ↓
SYNC
 ↓
LOGOUT

HP BARU
 ↓
LOGIN GOOGLE YANG SAMA
 ↓
UID SAMA
 ↓
FIRESTORE
 ↓
DATA TERAKHIR MUNCUL

Dan foto:

KAMERA
 ↓
FIREBASE STORAGE
 ↓
FIRESTORE METADATA
 ↓
GALERI

============================================================
35. CHECKPOINT SEBELUM PHASE BERIKUTNYA
============================================================

Jangan masuk migrasi data besar sebelum:

[ ] Firebase Project sudah dibuat
[ ] Web App sudah ditambahkan
[ ] config asli sudah dimasukkan
[ ] Google Authentication enabled
[ ] Firestore aktif
[ ] Rules terpasang
[ ] Login HP A berhasil
[ ] UID HP A tercatat
[ ] Logout berhasil
[ ] Login lagi berhasil
[ ] Login HP B dengan akun sama berhasil
[ ] UID HP B sama dengan HP A

SETELAH CHECKPOINT INI LULUS:
baru masuk Phase 2 dan mulai memindahkan data aplikasi secara bertahap.

============================================================
36. KESIMPULAN
============================================================

Inti proyek bukan sekadar "menambahkan Firebase".

Yang kita lakukan adalah memindahkan pusat kepemilikan data:

DARI:
HP + localStorage + Google Drive backup

MENJADI:
Firebase Authentication + UID + Firestore + Storage

Google Login tetap digunakan sebagai identitas login, tetapi Firebase Authentication menjadi pengelola sesi dan identitas.

Firestore menjadi database aplikasi.

Storage menjadi tempat foto/file.

LocalStorage boleh tetap ada untuk kebutuhan lokal perangkat, tetapi tidak lagi menjadi sumber utama data akun.

Google Drive backup lama tidak langsung dihapus.

Migrasi dilakukan bertahap supaya aplikasi SPX Express 12 tetap berfungsi selama proses perubahan.

============================================================
37. STATUS KITA SEKARANG
============================================================

Kita BELUM masuk ke migrasi seluruh data.

Kita berada di:

PHASE 1 → persiapan dan integrasi Firebase Authentication.

Kode awal sudah dibuat dalam:

SPX_FIREBASE_PHASE1_CODE.zip

Setelah checkpoint Authentication selesai, BARU:
PHASE 2 → Settings + Stores,
kemudian Scans,
History,
Recycle,
Anti Duplicate,
Realtime,
Foto,
Backup/Migration,
dan terakhir pembersihan Google Drive.

END OF MASTER BLUEPRINT

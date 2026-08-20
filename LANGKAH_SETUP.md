# SPX Express 12 — Langkah Setup Firebase (Phase 1)

> **Hosting Anda:** https://denrama38-sudo.github.io/SPX-Express-12-/  
> Panduan khusus GitHub Pages: lihat **DEPLOY_GITHUB_PAGES.md**

Ikuti langkah ini **berurutan**. Jangan loncat.

Ikuti langkah ini **berurutan**. Jangan loncat.

---

## A. Buat Project Firebase (sekali saja)

1. Buka https://console.firebase.google.com/
2. Klik **Add project** / **Tambahkan project**
3. Nama project: misalnya `spx-express-12` (bebas)
4. Matikan Google Analytics jika tidak perlu → **Create project**
5. Tunggu sampai project siap → **Continue**

---

## B. Tambah Web App

1. Di dashboard project, klik ikon **</>** (Web)
2. App nickname: `SPX Express 12`
3. **Jangan** centang Firebase Hosting dulu (opsional nanti)
4. Klik **Register app**
5. Akan muncul object `firebaseConfig` mirip:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "spx-express-12.firebaseapp.com",
  projectId: "spx-express-12",
  storageBucket: "spx-express-12.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

6. **Salin semua nilai itu** — nanti dimasukkan ke `firebase.js`

---

## C. Aktifkan Google Sign-In

1. Di menu kiri: **Build → Authentication**
2. Klik **Get started**
3. Tab **Sign-in method** → pilih **Google** → **Enable**
4. Isi **Project support email** (email Google Anda)
5. **Save**

### Authorized domains (penting untuk PWA / localhost)

1. Masih di Authentication → **Settings** → **Authorized domains**
2. Pastikan ada:
   - `localhost`
   - domain hosting Anda (jika sudah deploy)
3. Jika test dari IP lokal / ngrok, tambahkan domain itu

---

## D. Buat Firestore Database

1. Menu kiri: **Build → Firestore Database**
2. **Create database**
3. Pilih **Start in production mode** (kita pakai rules sendiri)
4. Pilih lokasi terdekat (mis. `asia-southeast2` Jakarta) → **Enable**

### Pasang Security Rules

1. Tab **Rules**
2. Hapus isi default
3. Copy **seluruh isi** file `firestore.rules` dari paket ini
4. **Publish**

---

## E. (Opsional Phase 5) Firebase Storage

1. **Build → Storage** → **Get started**
2. Pakai rules production
3. Ganti rules dengan isi file `storage.rules`
4. **Publish**

Untuk Phase 1 foto masih IndexedDB lokal — Storage belum wajib.

---

## F. Isi Config di Aplikasi

1. Buka file `firebase.js`
2. Cari blok:

```js
var firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  ...
};
```

3. Ganti **semua** `YOUR_...` dengan nilai dari langkah B
4. Simpan

---

## G. Cara Menjalankan / Test di HP

### Opsi 1 — Server lokal di PC + HP satu WiFi

```bash
# Di folder spx-firebase-v2
npx --yes serve -l 3000
```

Di HP buka: `http://IP-PC-ANDA:3000`  
(Pastikan `localhost` diganti IP, dan domain authorized di Firebase.)

### Opsi 2 — Deploy Firebase Hosting (disarankan)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# public directory = folder ini (.)
# single-page app = Yes
firebase deploy --only hosting
```

Authorized domain otomatis terdaftar.

### Opsi 3 — GitHub Pages / Netlify / Vercel

Upload folder ini, lalu **tambahkan domain** ke Authorized domains di Firebase Auth.

---

## H. Testing Phase 1 (wajib)

### HP A
1. Buka aplikasi
2. Aktivasi (jika ada lock screen / kode aktivasi seperti biasa)
3. Login Google → harus masuk Firebase
4. Di Settings, cek:
   - Nama & email muncul
   - Status: **Firebase: terhubung · UID xxxxxxxx…**
5. Catat UID (8 karakter pertama)

### HP B (atau browser lain / mode incognito)
1. Login **akun Google yang sama**
2. UID harus **sama** dengan HP A
3. Jika data lokal HP A tidak kosong, akan ada sync lokal → cloud
4. Jika lokal kosong, akan coba load dari cloud

### Logout
1. Settings → Logout
2. Overlay login muncul lagi
3. Data di Firestore **tidak** terhapus

### Akun berbeda
1. Login Google lain
2. UID berbeda → data tidak bercampur (rules melindungi)

---

## I. Struktur File Paket Ini

| File | Fungsi |
|------|--------|
| `index.html` | Aplikasi utama + script Firebase diinject |
| `firebase.js` | Init App, Auth, Firestore, `window.spxFirebase` |
| `firebase-data.js` | Data layer (settings, stores, scans, migrasi) |
| `spx-firebase-bridge.js` | Sambungan UI login/logout + dual-write |
| `firestore.rules` | Security Rules UID-only |
| `storage.rules` | Rules foto (Phase 5) |
| `manifest.json` | PWA |
| `sw.js` | Service worker (cache dasar) |
| `LANGKAH_SETUP.md` | Dokumen ini |
| `PHASE_NEXT.md` | Apa yang dikerjakan setelah Phase 1 stabil |

---

## J. Yang BELUM diubah (sengaja, sesuai blueprint)

- `localStorage` (`sn1`…`sn5`) masih sumber data harian di device
- Google Drive backup lama **masih ada** sebagai fallback
- Foto masih IndexedDB (`ScanNotePhotoDB`)
- Anti-duplicate lintas device belum final (butuh document ID atomik + test race)
- Realtime listener belum dipasang penuh

Ini **bukan bug** — ini urutan aman Phase 1 → 2 → …

---

## K. Troubleshooting

| Gejala | Perbaikan |
|--------|-----------|
| "Config Firebase belum diisi" | Edit `firebase.js` — masih `YOUR_API_KEY` |
| Login gagal / `auth/unauthorized-domain` | Tambah domain di Authentication → Authorized domains |
| `auth/operation-not-allowed` | Enable Google provider di Authentication |
| Firestore `permission-denied` | Publish ulang `firestore.rules` |
| Popup diblokir desktop | Izinkan popup, atau test di HP (redirect) |
| UID berbeda antar device | Pastikan akun Google **sama persis** |

---

## L. Setelah Phase 1 Lulus

Baca `PHASE_NEXT.md` untuk Phase 2 (Settings + Stores full cloud), lalu scans, history, anti-duplicate, foto Storage.

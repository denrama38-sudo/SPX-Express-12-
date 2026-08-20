# Deploy ke GitHub Pages — SPX Express 12

**URL target:** https://denrama38-sudo.github.io/SPX-Express-12-/

---

## 1. Upload file ke repo

Repo: `denrama38-sudo/SPX-Express-12-`

Isi **root** repo (bukan di dalam subfolder lain) dengan file dari paket `spx-firebase-v2`:

```
index.html
firebase.js
firebase-data.js
spx-firebase-bridge.js
manifest.json
sw.js
firestore.rules          (hanya referensi — rules dipasang di Firebase Console)
storage.rules
LANGKAH_SETUP.md
... (file lain opsional)
```

### Cara upload

**A. Via GitHub website**
1. Buka https://github.com/denrama38-sudo/SPX-Express-12-
2. Upload / drag semua file dari folder `spx-firebase-v2`
3. Commit

**B. Via Git (disarankan)**
```bash
git clone https://github.com/denrama38-sudo/SPX-Express-12-.git
cd SPX-Express-12-
# salin semua file dari spx-firebase-v2 ke sini
cp -r /path/ke/spx-firebase-v2/* .
git add .
git commit -m "Phase 1 Firebase + app"
git push origin main
```
(Branch bisa `main` atau `master` — sesuaikan Settings Pages.)

---

## 2. Aktifkan GitHub Pages

1. Repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` (atau `master`) → folder **/ (root)**
4. Save
5. Tunggu 1–2 menit, buka:
   https://denrama38-sudo.github.io/SPX-Express-12-/

---

## 3. Firebase — Authorized domain (WAJIB)

Tanpa ini, login Google **gagal** di GitHub Pages.

1. https://console.firebase.google.com/ → project Anda
2. **Authentication** → **Settings** → **Authorized domains**
3. Klik **Add domain**
4. Isi persis:

```
denrama38-sudo.github.io
```

5. Simpan

Jangan tulis path `/SPX-Express-12-` — cukup hostname saja.

---

## 4. Isi firebaseConfig

Sebelum atau sesudah push, edit `firebase.js` di repo:

```js
var firebaseConfig = {
  apiKey: "AIza....",                    // dari Firebase Console
  authDomain: "PROJECT_ID.firebaseapp.com",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT_ID.appspot.com",
  messagingSenderId: "....",
  appId: "1:....:web:...."
};
```

Commit & push lagi jika diedit lokal.

---

## 5. Firestore Rules

Di Firebase Console → Firestore → Rules → paste isi `firestore.rules` → **Publish**.

---

## 6. Test di HP

1. Buka https://denrama38-sudo.github.io/SPX-Express-12-/
2. Aktivasi app (jika ada)
3. Login Google
4. Settings → harus muncul **Firebase: terhubung · UID …**

Jika error `auth/unauthorized-domain` → ulangi langkah 3.

Jika error `auth/operation-not-allowed` → Authentication → Sign-in method → Google masih OFF.

---

## 7. Icon PWA (opsional)

Jika `icon-192.png` / `icon-512.png` belum ada di repo, PWA tetap jalan tapi tanpa ikon custom. Upload ikon ke root repo dengan nama itu.

Gambar UI lain yang direferensikan di HTML (jika dipakai):
- `headerimage.png`
- `heroScanImage.png`
- `heroscanicon.png`

Kalau tidak ada, HTML sudah `onerror` hide — aman.

---

## Checklist cepat

- [ ] Semua file Phase 1 di root repo
- [ ] GitHub Pages ON (branch root)
- [ ] URL https://denrama38-sudo.github.io/SPX-Express-12-/ bisa dibuka
- [ ] `firebase.js` sudah config asli (bukan YOUR_…)
- [ ] Domain `denrama38-sudo.github.io` di Authorized domains
- [ ] Google provider Enable
- [ ] Firestore rules sudah Publish
- [ ] Login test HP A + HP B akun sama → UID sama

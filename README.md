# SPX Express 12 — Firebase Edition (Phase 1)

Aplikasi scan barcode/QR **SPX Express 12** dengan fondasi **Firebase Authentication + Firestore**.

## Yang baru di paket ini

- Login Google lewat **Firebase Auth** (bukan hanya OAuth Drive)
- Data mengikuti **UID akun** → siap multi-device
- Skeleton data layer (settings, stores, scans, history, recycle)
- Security Rules ketat (hanya pemilik UID)
- Dual-write aman: localStorage tetap jalan, cloud disiapkan
- Google Drive backup lama **belum dihapus** (fallback)

## Mulai di sini

1. Baca **LANGKAH_SETUP.md** (wajib, langkah demi langkah)
2. Isi `firebaseConfig` di **firebase.js**
3. Deploy / serve folder ini
4. Test login di 2 perangkat
5. Setelah lulus → **PHASE_NEXT.md**

## File penting

| File | Keterangan |
|------|------------|
| index.html | App + integrasi Firebase |
| firebase.js | Init & Auth |
| firebase-data.js | API data Firestore |
| spx-firebase-bridge.js | Jembatan UI ↔ Firebase |
| firestore.rules | Rules keamanan |
| LANGKAH_SETUP.md | Setup Console Firebase |

## Dokumentasi konsep (asli)

- MASTER_BLUEPRINT_FIREBASE.md
- RENCANA_MIGRASI_FIREBASE.md
- CURRENT_STATUS.md

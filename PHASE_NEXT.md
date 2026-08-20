# SPX Express 12 — Roadmap Setelah Phase 1

Ikuti hanya setelah testing Phase 1 (login HP A + HP B, UID sama) lulus.

---

## Phase 2 — Settings + Stores

**Tujuan:** `set` dan `cats` ikut akun di Firestore.

1. Mapping field:
   - `set` → `users/{uid}/settings/config`
   - `cats[]` → `users/{uid}/stores/{storeId}` (pakai auto-id, field `name`)
2. Saat buka Settings / Toko:
   - load dari Firestore jika online & login
   - merge ke state lokal
3. Saat ubah setting / tambah toko:
   - simpan lokal (`save()`)
   - mirror ke Firestore (`spxFirebaseData.saveSettings` / `addStore`)
4. Test: ubah sound di HP A → muncul di HP B setelah reload

**Jangan** hapus localStorage di phase ini.

---

## Phase 3 — Scans + History + Recycle

1. `scans` → `users/{uid}/scans/{scanId}`  
   **scanId = ID barcode yang dinormalisasi (uppercase)**  
   → anti-duplicate alami (set document = atomic)
2. Operasi pindah scan → history/recycle harus aman:
   - tulis target dulu, baru hapus sumber
   - atau batch/transaction
3. Hook di fungsi scan sukses: `spxFirebaseData.addScan(...)`
4. Test race: 2 HP scan ID sama hampir bersamaan → hanya 1 yang menang

---

## Phase 4 — Realtime + Offline queue

1. `onSnapshot` untuk settings & stores (data kecil)
2. Scans: load on demand / pagination, bukan full listener 10k doc
3. Offline queue scan:
   - simpan antrean di IndexedDB
   - flush saat online
   - cek duplicate di server saat flush

---

## Phase 5 — Foto → Storage

1. Audit model IndexedDB `ScanNotePhotoDB` (field watermark, GPS, tanggal)
2. Upload file ke `users/{uid}/photos/{photoId}.jpg`
3. Metadata di `users/{uid}/photos/{photoId}` (Firestore)
4. Galeri load dari metadata + download URL
5. Migrasi foto lama: opsional, batch, jangan blocking UI

---

## Phase 6 — Cabut Google Drive lama + Migration tool UI

1. Tombol "Migrasi data lama ke Firebase" (sudah ada API `migrateLocalToFirestore`)
2. Export JSON tetap ada (dari state lokal atau dari cloud)
3. Setelah stabil 1–2 minggu: nonaktifkan path Drive backup di UI
4. Hapus dependency OAuth Drive jika tidak dipakai

---

## Phase 7 — Polish

- Indikator online/offline di header
- Conflict UI (jika setting bentrok)
- Optimasi biaya Firestore (index, limit query)
- Hardening rules (validate field types, max size)

---

## Prinsip yang tetap berlaku

1. Jangan rewrite dari nol
2. Jangan hapus fitur tanpa alasan
3. Firebase = source of truth **setelah** migrasi stabil
4. UID = pemilik data
5. Backup JSON tetap ada
6. Test multi-device setiap phase

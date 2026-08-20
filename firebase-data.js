/**
 * SPX Express 12 — Firebase Data Layer (Phase 1 skeleton + Phase 2 ready)
 * ========================================================================
 * Skeleton untuk settings, stores, scans, history, recycle.
 * Belum menggantikan localStorage sepenuhnya — dual-write aman.
 *
 * Dependency: window.spxFirebase (firebase.js)
 */
(function (global) {
  "use strict";

  function db() {
    if (!global.spxFirebase || !global.spxFirebase.db) {
      throw new Error("Firestore belum siap");
    }
    return global.spxFirebase.db;
  }

  function uid() {
    var u = global.spxFirebase && global.spxFirebase.getUid();
    if (!u) throw new Error("Belum login Firebase");
    return u;
  }

  function userRef() {
    return db().collection("users").doc(uid());
  }

  function nowISO() {
    return new Date().toISOString();
  }

  // ---------- Settings ----------
  async function loadSettings() {
    var ref = userRef().collection("settings").doc("config");
    var snap = await ref.get();
    if (!snap.exists) return null;
    return snap.data();
  }

  async function saveSettings(settingsObj) {
    var ref = userRef().collection("settings").doc("config");
    var payload = Object.assign({}, settingsObj || {}, { updatedAt: nowISO() });
    await ref.set(payload, { merge: true });
    return payload;
  }

  // ---------- Stores (cats) ----------
  async function loadStores() {
    var snap = await userRef().collection("stores").get();
    var list = [];
    snap.forEach(function (doc) {
      var d = doc.data();
      d.id = doc.id;
      list.push(d);
    });
    return list;
  }

  async function addStore(name) {
    var nameTrim = String(name || "").trim();
    if (!nameTrim) throw new Error("Nama toko kosong");
    var ref = userRef().collection("stores").doc();
    var data = {
      name: nameTrim,
      createdAt: nowISO(),
      updatedAt: nowISO()
    };
    await ref.set(data);
    data.id = ref.id;
    return data;
  }

  async function updateStore(storeId, patch) {
    var ref = userRef().collection("stores").doc(storeId);
    var data = Object.assign({}, patch || {}, { updatedAt: nowISO() });
    await ref.set(data, { merge: true });
    return data;
  }

  async function deleteStore(storeId) {
    await userRef().collection("stores").doc(storeId).delete();
  }

  // ---------- Scans ----------
  /**
   * scanId disarankan = normalized barcode/ID agar anti-duplicate atomik.
   * Field mengikuti struktur lokal: id, toko, time, dll.
   */
  async function addScan(scanData, options) {
    options = options || {};
    var rawId = scanData && (scanData.id || scanData.code || scanData.barcode);
    if (!rawId) throw new Error("Scan tanpa ID");
    var scanId = String(rawId).trim().toUpperCase();

    var ref = userRef().collection("scans").doc(scanId);
    var existing = await ref.get();
    if (existing.exists && !options.force) {
      var err = new Error("DUPLICATE");
      err.code = "DUPLICATE";
      err.existing = existing.data();
      throw err;
    }

    var payload = Object.assign({}, scanData, {
      id: scanId,
      createdAt: (scanData && scanData.createdAt) || nowISO(),
      updatedAt: nowISO(),
      deviceHint: (typeof navigator !== "undefined" && navigator.userAgent)
        ? navigator.userAgent.slice(0, 80)
        : ""
    });
    await ref.set(payload, { merge: !!options.force });
    return payload;
  }

  async function getScan(scanId) {
    var snap = await userRef().collection("scans").doc(String(scanId).toUpperCase()).get();
    if (!snap.exists) return null;
    var d = snap.data();
    d.id = snap.id;
    return d;
  }

  async function loadScans(limitCount) {
    var q = userRef().collection("scans").orderBy("createdAt", "desc");
    if (limitCount) q = q.limit(limitCount);
    var snap = await q.get();
    var list = [];
    snap.forEach(function (doc) {
      var d = doc.data();
      d.id = doc.id;
      list.push(d);
    });
    return list;
  }

  async function deleteScan(scanId) {
    await userRef().collection("scans").doc(String(scanId).toUpperCase()).delete();
  }

  // ---------- History ----------
  async function addHistory(item) {
    var ref = userRef().collection("history").doc();
    var payload = Object.assign({}, item || {}, {
      createdAt: (item && item.createdAt) || nowISO(),
      updatedAt: nowISO()
    });
    await ref.set(payload);
    payload.id = ref.id;
    return payload;
  }

  async function loadHistory(limitCount) {
    var q = userRef().collection("history").orderBy("createdAt", "desc");
    if (limitCount) q = q.limit(limitCount);
    var snap = await q.get();
    var list = [];
    snap.forEach(function (doc) {
      var d = doc.data();
      d.id = doc.id;
      list.push(d);
    });
    return list;
  }

  // ---------- Recycle ----------
  async function addRecycle(item) {
    var ref = userRef().collection("recycle").doc();
    var payload = Object.assign({}, item || {}, {
      createdAt: (item && item.createdAt) || nowISO(),
      updatedAt: nowISO()
    });
    await ref.set(payload);
    payload.id = ref.id;
    return payload;
  }

  async function loadRecycle() {
    var snap = await userRef().collection("recycle").orderBy("createdAt", "desc").get();
    var list = [];
    snap.forEach(function (doc) {
      var d = doc.data();
      d.id = doc.id;
      list.push(d);
    });
    return list;
  }

  async function deleteRecycle(itemId) {
    await userRef().collection("recycle").doc(itemId).delete();
  }

  // ---------- Bulk load (untuk sync awal) ----------
  async function loadAllAccountData() {
    var settings = null;
    var stores = [];
    var scans = [];
    var history = [];
    var recycle = [];
    try { settings = await loadSettings(); } catch (e) {}
    try { stores = await loadStores(); } catch (e) {}
    try { scans = await loadScans(5000); } catch (e) {}
    try { history = await loadHistory(2000); } catch (e) {}
    try { recycle = await loadRecycle(); } catch (e) {}
    return {
      settings: settings,
      stores: stores,
      scans: scans,
      history: history,
      recycle: recycle,
      loadedAt: nowISO()
    };
  }

  /**
   * Migrasi data lokal (localStorage shape) → Firestore
   * Aman: tidak menghapus lokal. Hanya menulis ke cloud.
   *
   * localShape:
   *  { scans: [], recycle: [], cats: [], set: {}, riwayat: [] }
   */
  async function migrateLocalToFirestore(localShape, onProgress) {
    localShape = localShape || {};
    var report = { settings: 0, stores: 0, scans: 0, history: 0, recycle: 0, errors: [] };

    function progress(msg) {
      if (typeof onProgress === "function") {
        try { onProgress(msg, report); } catch (e) {}
      }
    }

    // Settings
    if (localShape.set && typeof localShape.set === "object") {
      try {
        await saveSettings(localShape.set);
        report.settings = 1;
        progress("Settings OK");
      } catch (e) {
        report.errors.push("settings: " + e.message);
      }
    }

    // Stores (cats = array of string names in old app)
    var cats = localShape.cats || [];
    for (var i = 0; i < cats.length; i++) {
      try {
        var name = typeof cats[i] === "string" ? cats[i] : (cats[i] && cats[i].name) || "";
        if (name) {
          await addStore(name);
          report.stores++;
        }
      } catch (e) {
        report.errors.push("store " + i + ": " + e.message);
      }
    }
    progress("Stores: " + report.stores);

    // Scans
    var scans = localShape.scans || [];
    for (var j = 0; j < scans.length; j++) {
      try {
        await addScan(scans[j], { force: true });
        report.scans++;
      } catch (e) {
        report.errors.push("scan " + j + ": " + e.message);
      }
      if (j % 50 === 0) progress("Scans: " + report.scans + "/" + scans.length);
    }
    progress("Scans done: " + report.scans);

    // History
    var hist = localShape.riwayat || localShape.history || [];
    for (var k = 0; k < hist.length; k++) {
      try {
        await addHistory(hist[k]);
        report.history++;
      } catch (e) {
        report.errors.push("history " + k + ": " + e.message);
      }
    }
    progress("History: " + report.history);

    // Recycle
    var rec = localShape.recycle || [];
    for (var m = 0; m < rec.length; m++) {
      try {
        await addRecycle(rec[m]);
        report.recycle++;
      } catch (e) {
        report.errors.push("recycle " + m + ": " + e.message);
      }
    }
    progress("Recycle: " + report.recycle);

    return report;
  }

  // ---------- Dual-write helper (Phase 2) ----------
  /**
   * Setelah save() lokal, opsional mirror ke Firestore.
   * Tidak memblok UI; error hanya di-log.
   */
  function scheduleCloudSync(localShape) {
    if (!global.spxFirebase || !global.spxFirebase.isLoggedIn()) return;
    if (!navigator.onLine) return;
    setTimeout(function () {
      migrateLocalToFirestore(localShape).catch(function (e) {
        console.warn("[SPX Data] cloud sync", e);
      });
    }, 800);
  }

  global.spxFirebaseData = {
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    loadStores: loadStores,
    addStore: addStore,
    updateStore: updateStore,
    deleteStore: deleteStore,
    addScan: addScan,
    getScan: getScan,
    loadScans: loadScans,
    deleteScan: deleteScan,
    addHistory: addHistory,
    loadHistory: loadHistory,
    addRecycle: addRecycle,
    loadRecycle: loadRecycle,
    deleteRecycle: deleteRecycle,
    loadAllAccountData: loadAllAccountData,
    migrateLocalToFirestore: migrateLocalToFirestore,
    scheduleCloudSync: scheduleCloudSync
  };
})(typeof window !== "undefined" ? window : this);

/**
 * SPX Express 12 — Firebase Bridge (LOGIN FLOW FIXED)
 * ====================================================
 * Aturan tunggal:
 * 1. Belum login → tampil Google Login
 * 2. Sudah login (sukses / flag localStorage) → Home, JANGAN balik ke login
 * 3. Hanya tombol Logout yang boleh buka Google Login lagi
 */
(function () {
  "use strict";

  var KEY_FB_UID = "spxexp12_v2_fb_uid";
  var KEY_FB_MIGRATED = "spxexp12_v2_fb_migrated";
  var KEY_ON = "spxexp12_v2_on";
  var KEY_G_USER = "spxexp12_v2_guser";
  var KEY_G_TOKEN = "spxexp12_v2_gtoken";
  var KEY_FB_SESSION = "spxexp12_v2_fb_session";
  var KEY_LOGIN_OK = "spxexp12_v2_login_ok";

  function $(id) { return document.getElementById(id); }

  function toast(msg) {
    try {
      if (typeof window.toast === "function") window.toast(msg);
      else console.log("[SPX]", msg);
    } catch (e) {}
  }

  function isActivated() {
    return localStorage.getItem(KEY_ON) === "1";
  }

  function markLoginOk() {
    window.__spxLoginOk = true;
    try { localStorage.setItem(KEY_LOGIN_OK, "1"); } catch (e) {}
  }

  function clearLoginOk() {
    window.__spxLoginOk = false;
    try { localStorage.removeItem(KEY_LOGIN_OK); } catch (e) {}
  }

  function isLoginOk() {
    try {
      if (window.__spxLoginOk === true) return true;
      if (localStorage.getItem(KEY_LOGIN_OK) === "1") {
        window.__spxLoginOk = true;
        return true;
      }
    } catch (e) {}
    return false;
  }

  function mirrorSessionForLegacy(user) {
    if (!user) return;
    try {
      var u = {
        name: user.displayName || user.email || "Pengguna",
        email: user.email || "",
        picture: user.photoURL || "",
        sub: user.uid || ""
      };
      localStorage.setItem(KEY_G_USER, JSON.stringify(u));
      localStorage.setItem(KEY_G_TOKEN, "firebase-session:" + (user.uid || "1"));
      localStorage.setItem(KEY_FB_UID, user.uid || "");
      localStorage.setItem(KEY_FB_SESSION, "1");
      markLoginOk();
    } catch (e) {
      console.warn("mirrorSession", e);
    }
  }

  function clearLegacySession() {
    try {
      localStorage.removeItem(KEY_G_USER);
      localStorage.removeItem(KEY_G_TOKEN);
      localStorage.removeItem(KEY_FB_UID);
      localStorage.removeItem(KEY_FB_SESSION);
      localStorage.removeItem("spxexp12_v2_gfile");
      clearLoginOk();
    } catch (e) {}
  }

  function hideSplash() {
    var s = $("spxSplash");
    if (!s) return;
    try {
      s.classList.add("spx-hide");
      s.style.setProperty("display", "none", "important");
      s.style.setProperty("opacity", "0", "important");
      s.style.setProperty("visibility", "hidden", "important");
    } catch (e) {}
  }

  function hideGoogleLoginOverlay() {
    var sc = $("spxGoogleLogin");
    if (sc) {
      sc.classList.remove("spx-show");
      try { sc.style.setProperty("display", "none", "important"); } catch (e) { sc.style.display = "none"; }
      sc.style.visibility = "hidden";
      sc.style.pointerEvents = "none";
    }
    try {
      document.body.classList.remove("spx-google-locked");
      document.body.classList.remove("spx-locked");
    } catch (e) {}
  }

  function showGoogleLoginOverlay() {
    // SUDAH LOGIN → jangan pernah tampilkan lagi
    if (isLoginOk()) {
      hideGoogleLoginOverlay();
      return;
    }
    try {
      if (window.spxFirebase && window.spxFirebase.isLoggedIn && window.spxFirebase.isLoggedIn()) {
        markLoginOk();
        mirrorSessionForLegacy(window.spxFirebase.currentUser);
        hideGoogleLoginOverlay();
        return;
      }
    } catch (e) {}

    var sc = $("spxGoogleLogin");
    if (!sc) return;
    document.body.classList.add("spx-google-locked");
    sc.classList.add("spx-show");
    try { sc.style.setProperty("display", "flex", "important"); } catch (e) { sc.style.display = "flex"; }
    sc.style.visibility = "visible";
    sc.style.pointerEvents = "auto";
  }

  function enterApp(user) {
    markLoginOk();
    if (user) mirrorSessionForLegacy(user);
    hideSplash();
    hideGoogleLoginOverlay();
    updateFirebaseUI(user || null);
    try {
      if (typeof window.go === "function") window.go("home");
      else if (typeof go === "function") go("home");
    } catch (e) {}
    // Pastikan overlay tetap mati
    setTimeout(hideGoogleLoginOverlay, 50);
    setTimeout(hideGoogleLoginOverlay, 300);
    setTimeout(hideGoogleLoginOverlay, 1000);
  }

  function updateFirebaseUI(user) {
    var nameEl = $("spxGName");
    var emailEl = $("spxGEmail");
    var av = $("spxGAvatar");
    var sync = $("spxGSyncStatus");
    var btn = $("spxGoogleLogoutBtn");
    var fbBadge = $("spxFirebaseBadge");

    if (user) {
      if (nameEl) nameEl.textContent = user.displayName || "Pengguna Google";
      if (emailEl) emailEl.textContent = user.email || "—";
      if (av) {
        if (user.photoURL) {
          av.src = user.photoURL;
          av.style.display = "block";
        } else {
          av.style.display = "none";
        }
      }
      if (sync) {
        sync.textContent = "Firebase: terhubung · UID " + (user.uid || "").slice(0, 8) + "…";
        sync.className = "spx-g-sync on";
      }
      if (btn) btn.style.display = "block";
      if (fbBadge) {
        fbBadge.textContent = "Firebase ON";
        fbBadge.className = "spx-fb-badge on";
      }
    } else {
      if (nameEl) nameEl.textContent = "Belum masuk";
      if (emailEl) emailEl.textContent = "—";
      if (av) av.style.display = "none";
      if (sync) {
        sync.textContent = isLoginOk() ? "Firebase: sesi lokal aktif" : "Firebase: menunggu login";
        sync.className = isLoginOk() ? "spx-g-sync on" : "spx-g-sync";
      }
      if (btn) btn.style.display = isLoginOk() ? "block" : "none";
      if (fbBadge) {
        fbBadge.textContent = isLoginOk() ? "Sesi ON" : "Firebase OFF";
        fbBadge.className = isLoginOk() ? "spx-fb-badge on" : "spx-fb-badge";
      }
    }
  }

  // ===== LOGIN (swipe Google) =====
  window.spxGoogleSignIn = function () {
    var st = $("spxGoogleStatus");
    var err = $("spxGoogleError");
    if (err) {
      err.style.display = "none";
      err.textContent = "";
    }

    if (isLoginOk() && window.spxFirebase && window.spxFirebase.isLoggedIn && window.spxFirebase.isLoggedIn()) {
      enterApp(window.spxFirebase.currentUser);
      return;
    }

    if (st) st.textContent = "Membuka Google...";

    if (!window.spxFirebase) {
      if (err) {
        err.textContent = "Firebase belum dimuat — pastikan internet aktif, tutup & buka app lagi";
        err.style.display = "block";
      }
      if (st) st.textContent = "";
      return;
    }

    if (window.spxFirebase.isConfigPlaceholder && window.spxFirebase.isConfigPlaceholder()) {
      if (err) {
        err.textContent = "Config Firebase belum diisi";
        err.style.display = "block";
      }
      if (st) st.textContent = "";
      return;
    }

    function onSuccess(user) {
      if (st) st.textContent = "";
      // LANGKAH KRITIS: kunci sesi dulu sebelum hide overlay
      markLoginOk();
      mirrorSessionForLegacy(user);
      enterApp(user);
      toast("Masuk sebagai " + (user.email || user.displayName || "user"));
      installSaveHook();
      setTimeout(function () { afterLogin(user); }, 500);
    }

    function onFail(e) {
      console.error("login fail", e);
      if (st) st.textContent = "";
      var msg = (e && (e.message || e.code)) || "gagal";
      if (String(msg).indexOf("popup-closed") >= 0 || String(msg).indexOf("cancelled") >= 0) {
        if (err) {
          err.textContent = "Login dibatalkan";
          err.style.display = "block";
        }
        return;
      }
      if (err) {
        err.textContent = "Gagal masuk: " + msg;
        err.style.display = "block";
      }
      toast("Login gagal");
    }

    window.spxFirebase.signInWithGooglePopup()
      .then(onSuccess)
      .catch(function (e1) {
        console.warn("popup gagal, coba redirect", e1);
        if (st) st.textContent = "Mencoba metode lain...";
        window.spxFirebase.signInWithGoogle().catch(onFail);
      });
  };

  window.spxGoogleSignOut = function () {
    var user = window.spxFirebase && window.spxFirebase.currentUser;
    var label = (user && user.email) || "akun Google";

    function doOut() {
      var finish = function () {
        var pr = window.spxFirebase ? window.spxFirebase.signOut() : Promise.resolve();
        pr.then(function () {
          clearLegacySession();
          clearLoginOk();
          updateFirebaseUI(null);
          toast("Berhasil keluar");
          showGoogleLoginOverlay();
        }).catch(function (e) {
          // Tetap clear lokal meski signOut gagal
          clearLegacySession();
          clearLoginOk();
          updateFirebaseUI(null);
          showGoogleLoginOverlay();
          toast("Keluar (lokal)");
        });
      };
      if (window.spxFirebaseData && window.spxFirebaseData.saveAppData && navigator.onLine) {
        try {
          var shape = collectLocalShape();
          window.spxFirebaseData.saveAppData(shape).then(finish).catch(function () { finish(); });
        } catch (e) {
          finish();
        }
      } else {
        finish();
      }
    }

    if (typeof window.showAppConfirm === "function") {
      window.showAppConfirm("Keluar Akun Google", "Yakin keluar dari " + label + "?", doOut);
    } else if (typeof showAppConfirm === "function") {
      showAppConfirm("Keluar Akun Google", "Yakin keluar dari " + label + "?", doOut);
    } else {
      if (confirm("Keluar dari " + label + "?")) doOut();
    }
  };

  function collectLocalShape() {
    return {
      scans: (typeof scans !== "undefined" && scans) ? scans : [],
      recycle: (typeof recycle !== "undefined" && recycle) ? recycle : [],
      cats: (typeof cats !== "undefined" && cats) ? cats : [],
      set: (typeof set !== "undefined" && set) ? set : {},
      riwayat: (typeof riwayat !== "undefined" && riwayat) ? riwayat : []
    };
  }

  function localIsEmpty() {
    try {
      var shape = collectLocalShape();
      if (shape.scans && shape.scans.length) return false;
      if (shape.riwayat && shape.riwayat.length) return false;
      if (shape.recycle && shape.recycle.length) return false;
      // cats default punya isi bawaan app — jangan anggap "ada data user"
      // set default juga ada — cek flag sync
      return true;
    } catch (e) {
      return true;
    }
  }

  var cloudPushTimer = null;
  var cloudPushBusy = false;

  function scheduleFullCloudPush(reason) {
    if (!window.spxFirebase || !window.spxFirebase.isLoggedIn()) return;
    if (!window.spxFirebaseData || !window.spxFirebaseData.saveAppData) return;
    if (!navigator.onLine) return;
    if (cloudPushTimer) clearTimeout(cloudPushTimer);
    cloudPushTimer = setTimeout(function () {
      doFullCloudPush(reason || "save");
    }, 900);
  }
  // Dipanggil dari app saat keluar galeri foto → backup online
  window.spxRequestBackup = function (reason) {
    scheduleFullCloudPush(reason || "manual");
  };

  async function doFullCloudPush(reason) {
    if (cloudPushBusy) return;
    if (!window.spxFirebase || !window.spxFirebase.isLoggedIn()) return;
    if (!window.spxFirebaseData || !window.spxFirebaseData.saveAppData) return;
    if (!navigator.onLine) return;
    cloudPushBusy = true;
    var sync = $("spxGSyncStatus");
    try {
      var shape = collectLocalShape();
      await window.spxFirebaseData.saveAppData(shape);
      localStorage.setItem(KEY_FB_MIGRATED, window.spxFirebase.getUid() || "1");
      if (sync) {
        var tstr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        sync.textContent = "Firebase backup: tersimpan · " + tstr;
        sync.className = "spx-g-sync on";
      }
      console.log("[SPX] cloud push OK", reason);
    } catch (e) {
      console.error("[SPX] cloud push fail", e);
      if (sync) {
        sync.textContent = "Firebase backup gagal: " + String(e.message || e).slice(0, 40);
        sync.className = "spx-g-sync err";
      }
    } finally {
      cloudPushBusy = false;
    }
  }

  async function afterLogin(user) {
    if (!user) return;
    var sync = $("spxGSyncStatus");
    try {
      if (!window.spxFirebaseData || !window.spxFirebaseData.loadAppData) {
        console.warn("[SPX] spxFirebaseData.loadAppData tidak ada");
        return;
      }

      if (sync) {
        sync.textContent = "Firebase: sinkronisasi...";
        sync.className = "spx-g-sync";
      }

      // 1) Coba ambil backup cloud
      var cloud = null;
      try {
        cloud = await window.spxFirebaseData.loadAppData();
      } catch (e) {
        console.warn("[SPX] loadAppData", e);
      }

      var cloudEmpty = !cloud || (window.spxFirebaseData.isAppDataEmpty && window.spxFirebaseData.isAppDataEmpty(cloud));
      var emptyLocal = localIsEmpty();

      if (!cloudEmpty) {
        // Cloud punya data → restore ke lokal (prioritas setelah clear Chrome)
        applyCloudToLocal(cloud);
        toast("Data & setting dipulihkan dari Firebase");
        if (sync) {
          sync.textContent = "Firebase: data dipulihkan · " + (user.email || "");
          sync.className = "spx-g-sync on";
        }
        // Pastikan cloud tetap mirror lokal setelah apply
        scheduleFullCloudPush("after-restore");
      } else if (!emptyLocal) {
        // Cloud kosong, lokal ada → upload
        toast("Menyimpan data ke Firebase...");
        await doFullCloudPush("first-upload");
        toast("Data tersimpan di Firebase");
      } else {
        // Keduanya kosong
        if (sync) {
          sync.textContent = "Firebase: terhubung · siap backup";
          sync.className = "spx-g-sync on";
        }
      }
    } catch (e) {
      console.warn("afterLogin", e);
      toast("Sync Firebase gagal — coba lagi nanti");
    }
  }

  function applyCloudToLocal(cloud) {
    if (!cloud) return;
    try {
      if (Array.isArray(cloud.scans)) {
        scans = cloud.scans;
      }
      if (Array.isArray(cloud.riwayat)) {
        riwayat = cloud.riwayat;
      }
      if (Array.isArray(cloud.recycle)) {
        recycle = cloud.recycle;
      }
      if (Array.isArray(cloud.cats) && cloud.cats.length) {
        cats = cloud.cats;
      }
      if (cloud.set && typeof cloud.set === "object") {
        // merge ke object set yang ada
        if (typeof set === "undefined" || !set) {
          set = {};
        }
        Object.keys(cloud.set).forEach(function (k) {
          if (k === "updatedAt") return;
          set[k] = cloud.set[k];
        });
      }
      if (typeof save === "function") {
        // simpan lokal tanpa memicu push berulang terlalu cepat
        var hooked = save._spxFbHooked;
        var orig = save;
        // panggil storage langsung
        try {
          localStorage.setItem("sn1", JSON.stringify(scans));
          localStorage.setItem("sn2", JSON.stringify(recycle));
          localStorage.setItem("sn3", JSON.stringify(cats));
          localStorage.setItem("sn4", JSON.stringify(set));
          localStorage.setItem("sn5", JSON.stringify(riwayat));
        } catch (e) {}
        if (typeof stat === "function") stat();
      }
      if (typeof fill === "function") fill();
      if (typeof perToko === "function") perToko();
      if (typeof sw === "function") sw();
      if (typeof stat === "function") stat();
    } catch (e) {
      console.warn("applyCloudToLocal", e);
    }
  }

  function installSaveHook() {
    if (typeof save !== "function") return;
    if (save._spxFbHooked) return;
    var orig = save;
    save = function () {
      var r = orig.apply(this, arguments);
      try {
        scheduleFullCloudPush("save");
      } catch (e) {}
      return r;
    };
    save._spxFbHooked = 1;
  }

  function patchLegacyLoginCalls() {
    // Penjaga ketat: tiap 400ms, jika sudah login → paksa tutup overlay
    setInterval(function () {
      try {
        if (window.spxFirebase && window.spxFirebase.isLoggedIn && window.spxFirebase.isLoggedIn()) {
          markLoginOk();
          mirrorSessionForLegacy(window.spxFirebase.currentUser);
          enforceHideLoginIfOk();
          return;
        }
        if (isLoginOk()) {
          enforceHideLoginIfOk();
        }
      } catch (e) {}
    }, 400);
  }

  // ===== BOOT — alur tunggal, tanpa loop =====
  function bootBridge() {
    hideSplash();

    // Penjaga: kalau sudah login, overlay Google selalu ditutup
    setInterval(function () {
      if (isLoginOk()) {
        hideGoogleLoginOverlay();
      }
    }, 500);

    if (!window.spxFirebase) {
      console.warn("[Bridge] spxFirebase belum ada");
      // Tanpa Firebase: jika flag login ada → home, else login
      if (isLoginOk()) {
        enterApp(null);
      } else if (isActivated()) {
        showGoogleLoginOverlay();
      }
      return;
    }

    try {
      if (window.spxFirebase.auth && typeof firebase !== "undefined" && firebase.auth) {
        window.spxFirebase.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () {});
      }
    } catch (e) {}

    window.spxFirebase.waitAuthReady().then(function (user) {
      hideSplash();

      if (user) {
        // Firebase bilang sudah login → masuk app
        enterApp(user);
        installSaveHook();
        setTimeout(function () { afterLogin(user); }, 600);
        return;
      }

      // Firebase bilang BELUM login
      if (isLoginOk()) {
        // Flag lokal bilang sudah pernah login → TETAP di home
        // (jangan clear, jangan buka login — itu penyebab loop)
        enterApp(null);
        return;
      }

      // Benar-benar belum pernah login
      updateFirebaseUI(null);
      if (isActivated()) {
        showGoogleLoginOverlay();
      }
    }).catch(function () {
      if (isLoginOk()) enterApp(null);
      else if (isActivated()) showGoogleLoginOverlay();
    });

    window.spxFirebase.onAuth(function (user) {
      if (user) {
        // Login / restore sukses
        enterApp(user);
        installSaveHook();
      }
      // Jika user null: JANGAN buka login, JANGAN clear sesi
      // (bisa race saat restore; hanya logout manual yang clear)
    });

    setTimeout(installSaveHook, 1000);
    setTimeout(installSaveHook, 3000);
  }

  function ensureBadge() {
    if ($("spxFirebaseBadge")) return;
    var card = $("spxGSyncStatus");
    if (!card || !card.parentNode) return;
    var b = document.createElement("span");
    b.id = "spxFirebaseBadge";
    b.className = "spx-fb-badge";
    b.textContent = "Firebase";
    b.style.cssText = "display:inline-block;margin-left:8px;font-size:10px;padding:2px 8px;border-radius:8px;background:#334155;color:#94a3b8;";
    card.parentNode.insertBefore(b, card.nextSibling);
  }

  (function injectStyle() {
    var css = ".spx-fb-badge.on{background:#166534!important;color:#bbf7d0!important}";
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  })();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(bootBridge, 500);
      setTimeout(ensureBadge, 700);
    });
  } else {
    setTimeout(bootBridge, 500);
    setTimeout(ensureBadge, 700);
  }

  setTimeout(hideSplash, 4000);
  setTimeout(hideSplash, 7000);
})();

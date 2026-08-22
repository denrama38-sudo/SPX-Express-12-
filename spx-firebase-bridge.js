/**
 * SPX Express 12 — Firebase Bridge (Phase 1A) — FIX LOGIN LOOP
 * ============================================================
 * Masalah: setelah login Google (Firebase), kode Drive lama
 * mengecek KEY_G_TOKEN / KEY_G_USER → kosong → tampil login lagi.
 *
 * Perbaikan:
 * - Tulis "sesi palsu" ke KEY_G_USER agar kode lama diam
 * - Pakai popup (bukan redirect) supaya tidak reload race
 * - Paksa hide overlay login begitu Firebase user ada
 * - Blok showGoogleLogin lama saat Firebase sudah login
 */
(function () {
  "use strict";

  var KEY_FB_UID = "spxexp12_v2_fb_uid";
  var KEY_FB_MIGRATED = "spxexp12_v2_fb_migrated";
  var KEY_ON = "spxexp12_v2_on";
  var KEY_G_USER = "spxexp12_v2_guser";
  var KEY_G_TOKEN = "spxexp12_v2_gtoken";
  var KEY_FB_SESSION = "spxexp12_v2_fb_session";

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
      if (!localStorage.getItem(KEY_G_TOKEN)) {
        localStorage.setItem(KEY_G_TOKEN, "firebase-session:" + user.uid);
      }
      localStorage.setItem(KEY_FB_UID, user.uid);
      localStorage.setItem(KEY_FB_SESSION, "1");
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
    } catch (e) {}
  }

  function hideGoogleLoginOverlay() {
    var sc = $("spxGoogleLogin");
    if (sc) {
      sc.classList.remove("spx-show");
      sc.style.setProperty("display", "none", "important");
      sc.style.visibility = "hidden";
      sc.style.pointerEvents = "none";
    }
    document.body.classList.remove("spx-google-locked");
  }

  function showGoogleLoginOverlay() {
    if (window.spxFirebase && window.spxFirebase.isLoggedIn()) {
      hideGoogleLoginOverlay();
      return;
    }
    if (localStorage.getItem(KEY_FB_SESSION) === "1" && localStorage.getItem(KEY_FB_UID)) {
      return;
    }
    var sc = $("spxGoogleLogin");
    if (!sc) return;
    document.body.classList.add("spx-google-locked");
    sc.classList.add("spx-show");
    sc.style.setProperty("display", "flex", "important");
    sc.style.visibility = "visible";
    sc.style.pointerEvents = "auto";
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
        sync.textContent = "Firebase: menunggu login";
        sync.className = "spx-g-sync";
      }
      if (btn) btn.style.display = "none";
      if (fbBadge) {
        fbBadge.textContent = "Firebase OFF";
        fbBadge.className = "spx-fb-badge";
      }
    }
  }

  window.spxGoogleSignIn = function () {
    var st = $("spxGoogleStatus");
    var err = $("spxGoogleError");
    if (err) {
      err.style.display = "none";
      err.textContent = "";
    }
    // Sudah login → jangan buka picker lagi
    if (window.spxFirebase && window.spxFirebase.isLoggedIn && window.spxFirebase.isLoggedIn()) {
      hideGoogleLoginOverlay();
      updateFirebaseUI(window.spxFirebase.currentUser);
      return;
    }
    if (st) st.textContent = "Membuka Google...";

    // Deteksi file:// (AIDE / WebView lokal) → Firebase Auth selalu gagal unauthorized-domain
    // Pakai Google OAuth Token Client yang sudah ada di index.html
    var isFileOrigin = false;
    try {
      isFileOrigin = (location.protocol === "file:" || (location.href && location.href.indexOf("file://") === 0));
    } catch (e) {}

    if (isFileOrigin) {
      // Fallback ke Google OAuth Token Client (file:// tidak support Firebase Auth)
      if (st) st.textContent = "Menyiapkan Google Login...";
      var tries = 0;
      function tryTokenLogin() {
        tries++;
        try {
          if (typeof initTokenClient === "function") {
            var ok = initTokenClient();
            if (ok && typeof requestToken === "function") {
              if (st) st.textContent = "Membuka Google...";
              requestToken();
              return;
            }
          }
        } catch (e) {
          console.warn("token try", e);
        }
        if (tries < 15) {
          setTimeout(tryTokenLogin, 400);
          return;
        }
        // Gagal total
        if (st) st.textContent = "";
        if (err) {
          err.textContent = "Google script belum siap. Pastikan internet aktif, lalu tutup & buka app lagi.";
          err.style.display = "block";
        }
      }
      tryTokenLogin();
      return;
    }

    if (!window.spxFirebase) {
      if (err) {
        err.textContent = "Firebase belum dimuat — refresh halaman";
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
      mirrorSessionForLegacy(user);
      hideGoogleLoginOverlay();
      updateFirebaseUI(user);
      toast("Masuk sebagai " + (user.email || user.displayName || "user"));
      setTimeout(hideGoogleLoginOverlay, 50);
      setTimeout(hideGoogleLoginOverlay, 200);
      setTimeout(hideGoogleLoginOverlay, 500);
      setTimeout(hideGoogleLoginOverlay, 1000);
      setTimeout(function () { afterLogin(user); }, 400);
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
      // Jika unauthorized-domain, coba token client
      if (String(msg).indexOf("unauthorized-domain") >= 0 || String(msg).indexOf("unauthorized") >= 0) {
        try {
          if (typeof initTokenClient === "function") initTokenClient();
          if (typeof requestToken === "function") {
            if (st) st.textContent = "Mencoba metode alternatif...";
            requestToken();
            return;
          }
        } catch (ex) {}
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
      // Paksa backup terakhir sebelum logout
      var finish = function () {
        var pr = window.spxFirebase ? window.spxFirebase.signOut() : Promise.resolve();
        pr.then(function () {
          clearLegacySession();
          updateFirebaseUI(null);
          toast("Berhasil keluar");
          showGoogleLoginOverlay();
        }).catch(function (e) {
          toast("Gagal logout: " + (e.message || e));
        });
      };
      if (window.spxFirebaseData && window.spxFirebaseData.saveAppData && navigator.onLine) {
        try {
          var shape = collectLocalShape();
          window.spxFirebaseData.saveAppData(shape).then(finish).catch(function () { finish(); });
          return;
        } catch (e) {}
      }
      finish();
    }

    if (typeof showAppConfirm === "function") {
      showAppConfirm(
        "Keluar Akun",
        "Yakin keluar dari " + label + "? Data lokal tetap ada.",
        doOut
      );
    } else if (confirm("Keluar dari " + label + "?")) {
      doOut();
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
    setInterval(function () {
      try {
        if (window.spxFirebase && window.spxFirebase.isLoggedIn()) {
          hideGoogleLoginOverlay();
          mirrorSessionForLegacy(window.spxFirebase.currentUser);
          // Pastikan body tidak terkunci di layar login
          document.body.classList.remove("spx-google-locked");
        }
      } catch (e) {}
    }, 300);
  }

  function bootBridge() {
    hideSplash();
    patchLegacyLoginCalls();

    if (!window.spxFirebase) {
      console.warn("[Bridge] spxFirebase belum ada");
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
        mirrorSessionForLegacy(user);
        hideGoogleLoginOverlay();
        updateFirebaseUI(user);
        installSaveHook();
        setTimeout(hideGoogleLoginOverlay, 100);
        setTimeout(hideGoogleLoginOverlay, 500);
        setTimeout(function () { afterLogin(user); }, 600);
      } else {
        if (localStorage.getItem(KEY_FB_SESSION) === "1") {
          clearLegacySession();
        }
        updateFirebaseUI(null);
        if (isActivated()) {
          setTimeout(function () {
            if (!window.spxFirebase.isLoggedIn()) {
              showGoogleLoginOverlay();
            }
          }, 1200);
        }
      }
    });

    window.spxFirebase.onAuth(function (user) {
      if (user) {
        mirrorSessionForLegacy(user);
        hideGoogleLoginOverlay();
        updateFirebaseUI(user);
        installSaveHook();
      } else {
        updateFirebaseUI(null);
      }
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
      setTimeout(bootBridge, 600);
      setTimeout(ensureBadge, 800);
    });
  } else {
    setTimeout(bootBridge, 600);
    setTimeout(ensureBadge, 800);
  }

  setTimeout(hideSplash, 5500);
  setTimeout(hideSplash, 8500);
})();

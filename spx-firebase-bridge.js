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
    if (st) st.textContent = "Membuka Google...";

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
      var p = window.spxFirebase ? window.spxFirebase.signOut() : Promise.resolve();
      p.then(function () {
        clearLegacySession();
        updateFirebaseUI(null);
        toast("Berhasil keluar");
        showGoogleLoginOverlay();
      }).catch(function (e) {
        toast("Gagal logout: " + (e.message || e));
      });
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

  async function afterLogin(user) {
    if (!user) return;
    try {
      if (!window.spxFirebaseData) return;
      var localEmpty = true;
      try {
        if (typeof scans !== "undefined" && scans && scans.length) localEmpty = false;
        if (typeof riwayat !== "undefined" && riwayat && riwayat.length) localEmpty = false;
        if (typeof cats !== "undefined" && cats && cats.length) localEmpty = false;
      } catch (e) {}

      if (localEmpty) {
        toast("Memuat data akun dari cloud...");
        var cloud = await window.spxFirebaseData.loadAllAccountData();
        applyCloudToLocal(cloud);
        toast("Data cloud dimuat");
      } else {
        var migrated = localStorage.getItem(KEY_FB_MIGRATED);
        if (migrated !== user.uid) {
          toast("Sinkron data lokal → cloud...");
          var shape = {
            scans: typeof scans !== "undefined" ? scans : [],
            recycle: typeof recycle !== "undefined" ? recycle : [],
            cats: typeof cats !== "undefined" ? cats : [],
            set: typeof set !== "undefined" ? set : {},
            riwayat: typeof riwayat !== "undefined" ? riwayat : []
          };
          var report = await window.spxFirebaseData.migrateLocalToFirestore(shape);
          localStorage.setItem(KEY_FB_MIGRATED, user.uid);
          toast("Cloud sync: " + (report.scans || 0) + " scan, " + (report.stores || 0) + " toko");
        }
      }
    } catch (e) {
      console.warn("afterLogin", e);
    }
  }

  function applyCloudToLocal(cloud) {
    if (!cloud) return;
    try {
      if (cloud.scans && cloud.scans.length && typeof scans !== "undefined") scans = cloud.scans;
      if (cloud.history && cloud.history.length && typeof riwayat !== "undefined") riwayat = cloud.history;
      if (cloud.recycle && cloud.recycle.length && typeof recycle !== "undefined") recycle = cloud.recycle;
      if (cloud.stores && cloud.stores.length && typeof cats !== "undefined") {
        cats = cloud.stores.map(function (s) { return s.name || s.id; });
      }
      if (cloud.settings && typeof set !== "undefined") {
        Object.keys(cloud.settings).forEach(function (k) {
          if (k === "updatedAt") return;
          set[k] = cloud.settings[k];
        });
      }
      if (typeof save === "function") save();
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
        if (window.spxFirebase && window.spxFirebase.isLoggedIn() && window.spxFirebaseData && navigator.onLine) {
          var s = typeof set !== "undefined" ? set : {};
          window.spxFirebaseData.saveSettings(s).catch(function () {});
        }
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
        }
      } catch (e) {}
    }, 400);
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

  setTimeout(hideSplash, 4200);
  setTimeout(hideSplash, 7000);
})();

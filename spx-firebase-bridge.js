/**
 * SPX Express 12 — Firebase Bridge (Phase 1A)
 * ============================================
 * Menyambungkan Firebase Auth ke UI existing tanpa rewrite.
 * - Login Google → Firebase Auth (bukan raw OAuth Drive saja)
 * - Setelah login: pastikan profile, optional pull data cloud
 * - localStorage tetap dipakai (belum diganti)
 * - Google Drive backup lama tetap ada sebagai fallback
 *
 * Load order: firebase.js → firebase-data.js → spx-firebase-bridge.js → (app scripts)
 */
(function () {
  "use strict";

  var KEY_FB_UID = "spxexp12_v2_fb_uid";
  var KEY_FB_MIGRATED = "spxexp12_v2_fb_migrated";
  var KEY_ON = "spxexp12_v2_on";

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
      localStorage.setItem(KEY_FB_UID, user.uid);
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
      localStorage.removeItem(KEY_FB_UID);
    }
  }

  function hideGoogleLoginOverlay() {
    var sc = $("spxGoogleLogin");
    if (sc) {
      sc.classList.remove("spx-show");
      sc.style.display = "none";
    }
    document.body.classList.remove("spx-google-locked");
  }

  function showGoogleLoginOverlay() {
    var sc = $("spxGoogleLogin");
    if (!sc) return;
    document.body.classList.add("spx-google-locked");
    sc.classList.add("spx-show");
    sc.style.display = "flex";
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

  /**
   * Override tombol login Google agar memakai Firebase Auth
   * (fallback ke popup jika redirect gagal di desktop)
   */
  window.spxGoogleSignIn = function () {
    var st = $("spxGoogleStatus");
    var err = $("spxGoogleError");
    if (err) err.style.display = "none";
    if (st) st.textContent = "Membuka Google (Firebase)...";

    if (!window.spxFirebase) {
      if (err) {
        err.textContent = "Firebase belum dimuat";
        err.style.display = "block";
      }
      return;
    }

    if (window.spxFirebase.isConfigPlaceholder && window.spxFirebase.isConfigPlaceholder()) {
      if (err) {
        err.textContent = "Isi firebaseConfig di firebase.js dulu (lihat LANGKAH_SETUP.md)";
        err.style.display = "block";
      }
      if (st) st.textContent = "";
      toast("Config Firebase belum diisi");
      return;
    }

    var tryPopup = function () {
      return window.spxFirebase.signInWithGooglePopup().then(function (user) {
        if (st) st.textContent = "";
        hideGoogleLoginOverlay();
        updateFirebaseUI(user);
        toast("Masuk sebagai " + (user.email || user.displayName || "user"));
        afterLogin(user);
      });
    };

    // Mobile/PWA: prefer redirect; desktop: popup first
    var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.spxFirebase.signInWithGoogle().catch(function (e) {
        console.warn("redirect failed, try popup", e);
        tryPopup().catch(function (e2) {
          if (err) {
            err.textContent = "Gagal masuk: " + (e2.message || e2);
            err.style.display = "block";
          }
          if (st) st.textContent = "";
          toast("Login Firebase gagal");
        });
      });
    } else {
      tryPopup().catch(function (e) {
        console.warn("popup failed, try redirect", e);
        window.spxFirebase.signInWithGoogle().catch(function (e2) {
          if (err) {
            err.textContent = "Gagal masuk: " + (e2.message || e2);
            err.style.display = "block";
          }
          if (st) st.textContent = "";
          toast("Login Firebase gagal");
        });
      });
    }
  };

  window.spxGoogleSignOut = function () {
    var user = window.spxFirebase && window.spxFirebase.currentUser;
    var label = (user && user.email) || "akun Google";

    function doOut() {
      var p = window.spxFirebase ? window.spxFirebase.signOut() : Promise.resolve();
      p.then(function () {
        updateFirebaseUI(null);
        toast("Berhasil keluar dari Firebase");
        showGoogleLoginOverlay();
      }).catch(function (e) {
        toast("Gagal logout: " + (e.message || e));
      });
    }

    if (typeof showAppConfirm === "function") {
      showAppConfirm(
        "Keluar Akun",
        "Yakin keluar dari " + label + "? Data lokal tetap ada. Login ulang diperlukan untuk sync cloud.",
        doOut
      );
    } else if (confirm("Keluar dari " + label + "?")) {
      doOut();
    }
  };

  async function afterLogin(user) {
    if (!user) return;
    // Optional: pull cloud data if local empty
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
        // Dual-write: push local ke cloud (sekali jika belum migrasi)
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
          var report = await window.spxFirebaseData.migrateLocalToFirestore(shape, function (msg) {
            console.log("[migrate]", msg);
          });
          localStorage.setItem(KEY_FB_MIGRATED, user.uid);
          toast("Cloud sync: " + report.scans + " scan, " + report.stores + " toko");
        }
      }
    } catch (e) {
      console.warn("afterLogin sync", e);
    }
  }

  function applyCloudToLocal(cloud) {
    if (!cloud) return;
    try {
      if (cloud.scans && cloud.scans.length && typeof scans !== "undefined") {
        scans = cloud.scans;
      }
      if (cloud.history && cloud.history.length && typeof riwayat !== "undefined") {
        riwayat = cloud.history;
      }
      if (cloud.recycle && cloud.recycle.length && typeof recycle !== "undefined") {
        recycle = cloud.recycle;
      }
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

  /**
   * Hook save() agar setelah simpan lokal, jadwalkan sync ke cloud (Phase 2 partial)
   */
  function installSaveHook() {
    if (typeof save !== "function") return;
    if (save._spxFbHooked) return;
    var orig = save;
    save = function () {
      var r = orig.apply(this, arguments);
      try {
        if (window.spxFirebase && window.spxFirebase.isLoggedIn() && window.spxFirebaseData) {
          var shape = {
            scans: typeof scans !== "undefined" ? scans : [],
            recycle: typeof recycle !== "undefined" ? recycle : [],
            cats: typeof cats !== "undefined" ? cats : [],
            set: typeof set !== "undefined" ? set : {},
            riwayat: typeof riwayat !== "undefined" ? riwayat : []
          };
          // Hanya schedule settings+stores ringan dulu agar tidak spam
          if (navigator.onLine) {
            window.spxFirebaseData.saveSettings(shape.set).catch(function () {});
          }
        }
      } catch (e) {}
      return r;
    };
    save._spxFbHooked = 1;
  }

  function bootBridge() {
    hideSplash();

    if (!window.spxFirebase) {
      console.warn("[Bridge] spxFirebase belum ada");
      return;
    }

    window.spxFirebase.waitAuthReady().then(function (user) {
      hideSplash();
      if (!isActivated()) return;

      if (user) {
        hideGoogleLoginOverlay();
        updateFirebaseUI(user);
        installSaveHook();
        setTimeout(function () { afterLogin(user); }, 600);
      } else {
        // Belum login Firebase → tampilkan overlay login
        // (jika sistem activation lock sudah lewat)
        updateFirebaseUI(null);
        if (isActivated()) {
          showGoogleLoginOverlay();
        }
      }
    });

    window.spxFirebase.onAuth(function (user) {
      updateFirebaseUI(user);
      if (user) {
        hideGoogleLoginOverlay();
        installSaveHook();
      }
    });

    setTimeout(installSaveHook, 1000);
    setTimeout(installSaveHook, 3000);
  }

  // Inject badge kecil di settings jika belum ada
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

  // CSS badge on
  (function injectStyle() {
    var css = ".spx-fb-badge.on{background:#166534!important;color:#bbf7d0!important}";
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  })();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(bootBridge, 400);
      setTimeout(ensureBadge, 800);
    });
  } else {
    setTimeout(bootBridge, 400);
    setTimeout(ensureBadge, 800);
  }

  // Safety splash
  setTimeout(hideSplash, 2500);
  setTimeout(hideSplash, 5000);
})();

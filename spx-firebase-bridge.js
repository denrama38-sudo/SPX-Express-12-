/**
 * SPX Express 12 — Firebase Bridge (ANTI-LONCAT v4 - CLEAN)
 * ========================================================
 * Fokus: alur bersih setelah clear data
 * Splash → Aktivasi → Google Login → Home (tanpa loncat balik ke Splash)
 */
(function () {
  "use strict";

  var KEY_ON          = "spxexp12_v2_on";
  var KEY_G_USER      = "spxexp12_v2_guser";
  var KEY_G_TOKEN     = "spxexp12_v2_gtoken";
  var KEY_FB_UID      = "spxexp12_v2_fb_uid";
  var KEY_FB_SESSION  = "spxexp12_v2_fb_session";
  var KEY_FB_MIGRATED = "spxexp12_v2_fb_migrated";

  var authDecided = false;
  var splashKilled = false;

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

  function killSplashForever() {
    if (splashKilled) return;
    splashKilled = true;
    var s = $("spxSplash");
    if (!s) return;
    s.classList.add("spx-hide");
    s.style.setProperty("display", "none", "important");
    s.style.setProperty("opacity", "0", "important");
    s.style.setProperty("visibility", "hidden", "important");
    s.style.setProperty("pointer-events", "none", "important");
    s.style.setProperty("z-index", "-1", "important");
    try { s.remove(); } catch (e) {
      try { s.parentNode && s.parentNode.removeChild(s); } catch (e2) {}
    }
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
      localStorage.setItem(KEY_G_TOKEN, "firebase-session:" + user.uid);
      localStorage.setItem(KEY_FB_UID, user.uid);
      localStorage.setItem(KEY_FB_SESSION, "1");
    } catch (e) {}
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
      sc.style.opacity = "0";
    }
    document.body.classList.remove("spx-google-locked");
  }

  function showGoogleLoginOverlay() {
    if (window.spxFirebase && window.spxFirebase.isLoggedIn && window.spxFirebase.isLoggedIn()) {
      hideGoogleLoginOverlay();
      return;
    }
    killSplashForever();

    var sc = $("spxGoogleLogin");
    if (!sc) return;
    document.body.classList.add("spx-google-locked");
    sc.classList.add("spx-show");
    sc.style.setProperty("display", "flex", "important");
    sc.style.visibility = "visible";
    sc.style.pointerEvents = "auto";
    sc.style.opacity = "1";
    sc.style.zIndex = "2147483646";
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
        if (user.photoURL) { av.src = user.photoURL; av.style.display = "block"; }
        else av.style.display = "none";
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

  // ========== LOGIN ==========
  window.spxGoogleSignIn = function () {
    var st = $("spxGoogleStatus");
    var err = $("spxGoogleError");
    if (err) { err.style.display = "none"; err.textContent = ""; }

    if (window.spxFirebase && window.spxFirebase.isLoggedIn && window.spxFirebase.isLoggedIn()) {
      hideGoogleLoginOverlay();
      updateFirebaseUI(window.spxFirebase.currentUser);
      return;
    }
    if (st) st.textContent = "Membuka Google...";

    if (!window.spxFirebase) {
      if (err) { err.textContent = "Firebase belum dimuat"; err.style.display = "block"; }
      if (st) st.textContent = "";
      return;
    }

    function onSuccess(user) {
      if (st) st.textContent = "";
      authDecided = true;
      killSplashForever();
      mirrorSessionForLegacy(user);
      hideGoogleLoginOverlay();
      updateFirebaseUI(user);
      toast("Masuk sebagai " + (user.email || user.displayName || "user"));
      [50, 200, 500, 1000].forEach(function (t) {
        setTimeout(function () {
          killSplashForever();
          hideGoogleLoginOverlay();
        }, t);
      });
      setTimeout(function () { afterLogin(user); }, 500);
    }

    function onFail(e) {
      console.error("login fail", e);
      if (st) st.textContent = "";
      var msg = (e && (e.message || e.code)) || "gagal";
      if (String(msg).indexOf("popup-closed") >= 0 || String(msg).indexOf("cancelled") >= 0) {
        if (err) { err.textContent = "Login dibatalkan"; err.style.display = "block"; }
        return;
      }
      if (err) { err.textContent = "Gagal masuk: " + msg; err.style.display = "block"; }
      toast("Login gagal");
    }

    window.spxFirebase.signInWithGoogle()
      .then(onSuccess)
      .catch(function (e1) {
        console.warn("popup gagal", e1);
        if (st) st.textContent = "Mencoba metode lain...";
        if (window.spxFirebase.signInWithGoogleRedirect) {
          window.spxFirebase.signInWithGoogleRedirect().catch(onFail);
        } else {
          onFail(e1);
        }
      });
  };

  // ========== LOGOUT ==========
  window.spxGoogleSignOut = function () {
    var user = window.spxFirebase && window.spxFirebase.currentUser;
    var label = (user && user.email) || "akun Google";

    function doOut() {
      authDecided = true;
      clearLegacySession();
      updateFirebaseUI(null);
      killSplashForever();
      showGoogleLoginOverlay();

      var finish = function () {
        var pr = window.spxFirebase ? window.spxFirebase.signOut() : Promise.resolve();
        pr.then(function () {
          clearLegacySession();
          updateFirebaseUI(null);
          killSplashForever();
          showGoogleLoginOverlay();
          toast("Berhasil keluar");
          [200, 600, 1200].forEach(function (t) {
            setTimeout(function () {
              killSplashForever();
              showGoogleLoginOverlay();
            }, t);
          });
        }).catch(function (e) {
          toast("Gagal logout: " + (e.message || e));
          showGoogleLoginOverlay();
        });
      };

      if (window.spxFirebaseData && window.spxFirebaseData.saveAppData && navigator.onLine) {
        try {
          var shape = collectLocalShape();
          window.spxFirebaseData.saveAppData(shape).then(finish).catch(finish);
          return;
        } catch (e) {}
      }
      finish();
    }

    if (typeof showAppConfirm === "function") {
      showAppConfirm("Keluar Akun", "Yakin keluar dari " + label + "? Data lokal tetap ada.", doOut);
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
      return true;
    } catch (e) { return true; }
  }

  var cloudPushTimer = null;
  var cloudPushBusy = false;

  function scheduleFullCloudPush(reason) {
    if (!window.spxFirebase || !window.spxFirebase.isLoggedIn()) return;
    if (!window.spxFirebaseData || !window.spxFirebaseData.saveAppData) return;
    if (!navigator.onLine) return;
    if (cloudPushTimer) clearTimeout(cloudPushTimer);
    cloudPushTimer = setTimeout(function () { doFullCloudPush(reason || "save"); }, 900);
  }

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
    } catch (e) {
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
      if (!window.spxFirebaseData || !window.spxFirebaseData.loadAppData) return;
      if (sync) {
        sync.textContent = "Firebase: sinkronisasi...";
        sync.className = "spx-g-sync";
      }
      var cloud = null;
      try { cloud = await window.spxFirebaseData.loadAppData(); } catch (e) {}
      var cloudEmpty = !cloud || (window.spxFirebaseData.isAppDataEmpty && window.spxFirebaseData.isAppDataEmpty(cloud));
      var emptyLocal = localIsEmpty();

      if (!cloudEmpty) {
        applyCloudToLocal(cloud);
        toast("Data & setting dipulihkan dari Firebase");
        if (sync) {
          sync.textContent = "Firebase: data dipulihkan · " + (user.email || "");
          sync.className = "spx-g-sync on";
        }
        scheduleFullCloudPush("after-restore");
      } else if (!emptyLocal) {
        toast("Menyimpan data ke Firebase...");
        await doFullCloudPush("first-upload");
        toast("Data tersimpan di Firebase");
      } else {
        if (sync) {
          sync.textContent = "Firebase: terhubung · siap backup";
          sync.className = "spx-g-sync on";
        }
      }
    } catch (e) {
      toast("Sync Firebase gagal — coba lagi nanti");
    }
  }

  function applyCloudToLocal(cloud) {
    if (!cloud) return;
    try {
      if (Array.isArray(cloud.scans)) scans = cloud.scans;
      if (Array.isArray(cloud.riwayat)) riwayat = cloud.riwayat;
      if (Array.isArray(cloud.recycle)) recycle = cloud.recycle;
      if (Array.isArray(cloud.cats) && cloud.cats.length) cats = cloud.cats;
      if (cloud.set && typeof cloud.set === "object") {
        Object.keys(cloud.set).forEach(function (k) {
          if (k !== "updatedAt") set[k] = cloud.set[k];
        });
      }
      try {
        localStorage.setItem("sn1", JSON.stringify(scans || []));
        localStorage.setItem("sn2", JSON.stringify(recycle || []));
        localStorage.setItem("sn3", JSON.stringify(cats || []));
        localStorage.setItem("sn4", JSON.stringify(set || {}));
        localStorage.setItem("sn5", JSON.stringify(riwayat || []));
      } catch (e) {}
      if (typeof fill === "function") fill();
      if (typeof perToko === "function") perToko();
      if (typeof sw === "function") sw();
      if (typeof stat === "function") stat();
    } catch (e) {}
  }

  function installSaveHook() {
    if (typeof save !== "function" || save._spxFbHooked) return;
    var orig = save;
    save = function () {
      var r = orig.apply(this, arguments);
      try { scheduleFullCloudPush("save"); } catch (e) {}
      return r;
    };
    save._spxFbHooked = 1;
  }

  // ========== PENJAGA ==========
  function guardLoop() {
    try {
      if (authDecided) {
        killSplashForever();
      }

      if (!authDecided) return;

      if (window.spxFirebase && window.spxFirebase.isLoggedIn && window.spxFirebase.isLoggedIn()) {
        hideGoogleLoginOverlay();
        mirrorSessionForLegacy(window.spxFirebase.currentUser);
        document.body.classList.remove("spx-google-locked");
      } else {
        if (isActivated()) {
          showGoogleLoginOverlay();
        }
      }
    } catch (e) {}
  }

  function neutralizeLegacy() {
    try {
      window.showGoogleLogin = function () {
        if (window.spxFirebase && window.spxFirebase.isLoggedIn && window.spxFirebase.isLoggedIn()) {
          hideGoogleLoginOverlay();
          return;
        }
        if (isActivated()) showGoogleLoginOverlay();
      };
      window.hideGoogleLogin = function () {
        if (window.spxFirebase && window.spxFirebase.isLoggedIn && window.spxFirebase.isLoggedIn()) {
          hideGoogleLoginOverlay();
        }
      };
    } catch (e) {}
  }

  // Pantau aktivasi (saat user baru input kode)
  function watchActivation() {
    var last = isActivated();
    setInterval(function () {
      var now = isActivated();
      if (now && !last) {
        // Baru saja aktivasi → langsung ke login Google + bunuh splash
        last = true;
        killSplashForever();
        setTimeout(function () {
          if (!(window.spxFirebase && window.spxFirebase.isLoggedIn && window.spxFirebase.isLoggedIn())) {
            showGoogleLoginOverlay();
          }
        }, 300);
      }
      last = now;
    }, 300);
  }

  function bootBridge() {
    neutralizeLegacy();
    watchActivation();
    setInterval(guardLoop, 200);
    setInterval(neutralizeLegacy, 1500);

    if (isActivated()) {
      setTimeout(function () {
        if (!authDecided) {
          // masih nunggu Firebase
        }
      }, 1000);
    }

    if (!window.spxFirebase) {
      console.warn("[Bridge] spxFirebase belum ada");
      setTimeout(function () {
        if (!authDecided) {
          authDecided = true;
          killSplashForever();
          if (isActivated()) showGoogleLoginOverlay();
        }
      }, 7000);
      return;
    }

    window.spxFirebase.waitAuthReady().then(function (user) {
      authDecided = true;
      killSplashForever();

      if (user) {
        mirrorSessionForLegacy(user);
        hideGoogleLoginOverlay();
        updateFirebaseUI(user);
        installSaveHook();
        [50, 200, 500].forEach(function (t) {
          setTimeout(function () {
            killSplashForever();
            hideGoogleLoginOverlay();
          }, t);
        });
        setTimeout(function () { afterLogin(user); }, 600);
      } else {
        clearLegacySession();
        updateFirebaseUI(null);
        if (isActivated()) {
          showGoogleLoginOverlay();
        }
      }
    });

    window.spxFirebase.onAuth(function (user) {
      authDecided = true;
      killSplashForever();
      if (user) {
        mirrorSessionForLegacy(user);
        hideGoogleLoginOverlay();
        updateFirebaseUI(user);
        installSaveHook();
      } else {
        clearLegacySession();
        updateFirebaseUI(null);
        if (isActivated()) showGoogleLoginOverlay();
      }
    });

    setTimeout(installSaveHook, 1500);
    setTimeout(installSaveHook, 3500);
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
    var css =
      ".spx-fb-badge.on{background:#166534!important;color:#bbf7d0!important}" +
      "body.spx-google-locked #spxGoogleLogin{display:flex!important;visibility:visible!important;opacity:1!important;z-index:2147483646!important}" +
      "body.spx-google-locked > *:not(#spxGoogleLogin):not(#spxLockScreen):not(#spxSplash):not(script){visibility:hidden!important;pointer-events:none!important}";
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  })();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(bootBridge, 250);
      setTimeout(ensureBadge, 900);
    });
  } else {
    setTimeout(bootBridge, 250);
    setTimeout(ensureBadge, 900);
  }

  // Safety net
  setTimeout(function () {
    if (!authDecided) {
      authDecided = true;
      killSplashForever();
      if (isActivated() && !(window.spxFirebase && window.spxFirebase.isLoggedIn && window.spxFirebase.isLoggedIn())) {
        showGoogleLoginOverlay();
      }
    }
  }, 9000);
})();

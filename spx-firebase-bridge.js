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
    // Boleh ditampilkan dari Pengaturan (user sadar minta login)
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
    try { if (typeof updateSettingsCard === "function") updateSettingsCard(); } catch (e) {}
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
    if (err) { err.style.display = "none"; err.textContent = ""; }
    if (st) st.textContent = "Membuka Google...";

    // Sudah login → langsung home
    if (isLoginOk()) {
      try {
        if (window.spxFirebase && window.spxFirebase.isLoggedIn && window.spxFirebase.isLoggedIn()) {
          enterApp(window.spxFirebase.currentUser);
          return;
        }
      } catch (e) {}
      enterApp(null);
      return;
    }

    function finishLocalUser(profile) {
      // Sesi lokal WAJIB — biar WebView tidak loop meski Firebase gagal
      try {
        var u = {
          name: (profile && (profile.name || profile.email)) || "Pengguna Google",
          email: (profile && profile.email) || "",
          picture: (profile && (profile.picture || profile.photoURL)) || "",
          sub: (profile && (profile.sub || profile.id || profile.uid)) || ("local-" + Date.now())
        };
        localStorage.setItem(KEY_G_USER, JSON.stringify(u));
        localStorage.setItem(KEY_G_TOKEN, "firebase-session:" + u.sub);
        localStorage.setItem(KEY_FB_UID, u.sub);
        localStorage.setItem(KEY_FB_SESSION, "1");
        markLoginOk();
      } catch (e) {}
      if (st) st.textContent = "";
      enterApp(null);
      toast("Masuk sebagai " + ((profile && profile.email) || (profile && profile.name) || "Google"));
      // Sync cloud setelah login dari Pengaturan (jika Firebase siap)
      try {
        if (window.spxFirebase && window.spxFirebase.currentUser) {
          setTimeout(function () { afterLogin(window.spxFirebase.currentUser); }, 500);
        }
      } catch (e) {}
    }

    function loadGsiScript(cb) {
      if (typeof google !== "undefined" && google.accounts && google.accounts.oauth2) {
        cb(true);
        return;
      }
      if (!document.querySelector('script[data-spx-gsi="1"]')) {
        var s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.setAttribute("data-spx-gsi", "1");
        document.head.appendChild(s);
      }
      var n = 0;
      var iv = setInterval(function () {
        n++;
        if (typeof google !== "undefined" && google.accounts && google.accounts.oauth2) {
          clearInterval(iv);
          cb(true);
        } else if (n >= 20) {
          clearInterval(iv);
          cb(false);
        }
      }, 200);
    }

    function tryGisTokenLogin() {
      if (st) st.textContent = "Menyiapkan Google...";
      loadGsiScript(function (ok) {
        if (!ok) {
          // GIS gagal di WebView → pakai Firebase redirect (buka halaman Google di WebView yang sama)
          if (st) st.textContent = "Membuka halaman Google...";
          if (err) { err.style.display = "none"; err.textContent = ""; }
          try {
            localStorage.setItem("spxexp12_v2_login_pending", "1");
          } catch (e) {}
          if (window.spxFirebase && window.spxFirebase.signInWithGoogle) {
            window.spxFirebase.signInWithGoogle().catch(function (e2) {
              console.error("redirect fail", e2);
              if (st) st.textContent = "";
              if (err) {
                err.innerHTML = "Gagal buka Google. Cek internet lalu coba lagi.<br><button type='button' id='spxRetryGoogleBtn' style='margin-top:10px;padding:10px;width:100%;border:0;border-radius:10px;background:#4285f4;color:#fff;font-weight:700'>Coba Lagi</button>";
                err.style.display = "block";
                setTimeout(function () {
                  var b = document.getElementById("spxRetryGoogleBtn");
                  if (b) b.onclick = function () { tryGisTokenLogin(); };
                }, 50);
              }
            });
          } else {
            if (st) st.textContent = "";
            if (err) {
              err.textContent = "Firebase belum siap. Tutup app, pastikan internet, buka lagi.";
              err.style.display = "block";
            }
          }
          return;
        }
        if (st) st.textContent = "Memilih akun Google...";
        try {
          var client = google.accounts.oauth2.initTokenClient({
            client_id: "298099761518-37i2is5l1vjk904ogrfjt687v7vfss7i.apps.googleusercontent.com",
            scope: "openid email profile",
            callback: function (resp) {
              if (!resp || resp.error) {
                if (st) st.textContent = "";
                if (err) {
                  err.textContent = "Login dibatalkan / gagal";
                  err.style.display = "block";
                }
                return;
              }
              var token = resp.access_token;
              if (!token) {
                if (st) st.textContent = "";
                if (err) { err.textContent = "Token Google kosong"; err.style.display = "block"; }
                return;
              }
              if (st) st.textContent = "Mengambil profil...";
              fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: "Bearer " + token }
              })
                .then(function (r) { return r.json(); })
                .then(function (profile) {
                  finishLocalUser(profile);
                  tryLinkFirebase(resp);
                })
                .catch(function () {
                  finishLocalUser({ name: "Pengguna Google", email: "", sub: "gis-" + Date.now() });
                });
            }
          });
          client.requestAccessToken({ prompt: "select_account" });
        } catch (e) {
          console.error("GIS login", e);
          if (st) st.textContent = "";
          if (err) {
            err.textContent = "Gagal buka Google: " + (e.message || e);
            err.style.display = "block";
          }
        }
      });
    }

    function tryLinkFirebase(tokenResp) {
      try {
        if (!window.spxFirebase || !window.spxFirebase.auth) return;
        // Firebase popup/redirect sering gagal di WebView — tidak memblokir masuk app
        if (window.spxFirebase.signInWithGooglePopup) {
          window.spxFirebase.signInWithGooglePopup().then(function (user) {
            mirrorSessionForLegacy(user);
            updateFirebaseUI(user);
            installSaveHook();
            setTimeout(function () { afterLogin(user); }, 400);
          }).catch(function () {});
        }
      } catch (e) {}
    }

    // Deteksi WebView Android app
    var ua = navigator.userAgent || "";
    var isAppWebView = /SPXExpress12Android|; wv\)|WebView/i.test(ua);

    // Di WebView: langsung GIS (lebih andal). Di browser: coba Firebase dulu.
    if (isAppWebView || !window.spxFirebase) {
      tryGisTokenLogin();
      return;
    }

    if (window.spxFirebase.isConfigPlaceholder && window.spxFirebase.isConfigPlaceholder()) {
      tryGisTokenLogin();
      return;
    }

    window.spxFirebase.signInWithGooglePopup()
      .then(function (user) {
        if (st) st.textContent = "";
        markLoginOk();
        mirrorSessionForLegacy(user);
        enterApp(user);
        toast("Masuk sebagai " + (user.email || user.displayName || "user"));
        installSaveHook();
        setTimeout(function () { afterLogin(user); }, 500);
      })
      .catch(function (e1) {
        console.warn("Firebase popup gagal, fallback GIS", e1);
        tryGisTokenLogin();
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
          hideGoogleLoginOverlay();
          toast("Berhasil keluar — data lokal tetap ada");
        }).catch(function (e) {
          clearLegacySession();
          clearLoginOk();
          updateFirebaseUI(null);
          hideGoogleLoginOverlay();
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


  // ===== BOOT — alur tunggal, tanpa loop =====
  function bootBridge() {
    hideSplash();
    hideGoogleLoginOverlay();

    // Preload Google script (untuk login di Pengaturan)
    try {
      if (!(typeof google !== "undefined" && google.accounts)) {
        var s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.setAttribute("data-spx-gsi", "1");
        document.head.appendChild(s);
      }
    } catch (e) {}

    // Jangan auto-hide overlay — user bisa buka dari Pengaturan
    // Setelah login sukses, enterApp/hideGoogleLoginOverlay yang menutup.

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
      hideGoogleLoginOverlay();

      if (user) {
        markLoginOk();
        mirrorSessionForLegacy(user);
        updateFirebaseUI(user);
        installSaveHook();
        setTimeout(function () { afterLogin(user); }, 600);
      } else {
        updateFirebaseUI(null);
        // TIDAK buka login gate — user login manual di Pengaturan
      }
    }).catch(function () {
      hideGoogleLoginOverlay();
    });

    window.spxFirebase.onAuth(function (user) {
      if (user) {
        markLoginOk();
        mirrorSessionForLegacy(user);
        updateFirebaseUI(user);
        installSaveHook();
        // Sync data setelah login dari Pengaturan
        setTimeout(function () { afterLogin(user); }, 400);
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

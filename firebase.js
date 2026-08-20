/**
 * SPX Express 12 — Firebase Foundation (Phase 1)
 * =================================================
 * - initializeApp
 * - Auth (Google Sign-In via Redirect)
 * - Firestore instance
 * - ensureUserProfile
 * - window.spxFirebase API
 *
 * PENTING: Ganti firebaseConfig di bawah dengan config dari
 * Firebase Console → Project Settings → Your apps → Web app.
 */
(function (global) {
  "use strict";

  // ========== GANTI DENGAN CONFIG ASLI DARI FIREBASE CONSOLE ==========
  var firebaseConfig = {
    apiKey: "AIzaSyACIijza4C9U-G6zxXwwVGtMneW2rkKLQQ",
    authDomain: "spx-express-12-e58b3.firebaseapp.com",
    projectId: "spx-express-12-e58b3",
    storageBucket: "spx-express-12-e58b3.firebasestorage.app",
    messagingSenderId: "704095601215",
    appId: "1:704095601215:web:bce0ee04eb26aa226f6e8a"
  };
  // ====================================================================

  var app = null;
  var auth = null;
  var db = null;
  var storage = null;
  var currentUser = null;
  var authReady = false;
  var authReadyPromise = null;
  var authReadyResolve = null;
  var listeners = [];

  authReadyPromise = new Promise(function (resolve) {
    authReadyResolve = resolve;
  });

  function isConfigPlaceholder() {
    return !firebaseConfig.apiKey || firebaseConfig.apiKey.indexOf("YOUR_") === 0;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("Gagal load: " + src)); };
      document.head.appendChild(s);
    });
  }

  async function loadFirebaseSDK() {
    // Firebase compat SDK (mudah dipakai di single-file HTML)
    var base = "https://www.gstatic.com/firebasejs/10.14.1/";
    await loadScript(base + "firebase-app-compat.js");
    await loadScript(base + "firebase-auth-compat.js");
    await loadScript(base + "firebase-firestore-compat.js");
    await loadScript(base + "firebase-storage-compat.js");
  }

  async function init() {
    if (isConfigPlaceholder()) {
      console.warn("[SPX Firebase] Config masih placeholder. Isi firebaseConfig di firebase.js.");
      authReady = true;
      if (authReadyResolve) authReadyResolve(null);
      return;
    }

    try {
      await loadFirebaseSDK();
    } catch (e) {
      console.error("[SPX Firebase] SDK load failed", e);
      authReady = true;
      if (authReadyResolve) authReadyResolve(null);
      return;
    }

    if (typeof firebase === "undefined") {
      console.error("[SPX Firebase] firebase global tidak ada");
      authReady = true;
      if (authReadyResolve) authReadyResolve(null);
      return;
    }

    try {
      app = firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      try {
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      } catch (e) {}
      db = firebase.firestore();
      try {
        storage = firebase.storage();
      } catch (e) {
        storage = null;
      }

      // Persistence offline Firestore (best-effort)
      try {
        await db.enablePersistence({ synchronizeTabs: true });
      } catch (e) {
        // multiple tabs / unsupported — ignore
      }

      // Handle redirect result (login dari Google)
      try {
        var result = await auth.getRedirectResult();
        if (result && result.user) {
          currentUser = result.user;
          await ensureUserProfile(result.user);
        }
      } catch (e) {
        console.warn("[SPX Firebase] getRedirectResult", e);
      }

      auth.onAuthStateChanged(async function (user) {
        currentUser = user || null;
        authReady = true;
        if (user) {
          try {
            await ensureUserProfile(user);
          } catch (e) {
            console.warn("[SPX Firebase] ensureUserProfile", e);
          }
        }
        if (authReadyResolve) {
          authReadyResolve(user);
          authReadyResolve = null;
        }
        listeners.forEach(function (fn) {
          try { fn(user); } catch (e) {}
        });
      });
    } catch (e) {
      console.error("[SPX Firebase] init error", e);
      authReady = true;
      if (authReadyResolve) authReadyResolve(null);
    }
  }

  async function ensureUserProfile(user) {
    if (!db || !user) return;
    var ref = db.collection("users").doc(user.uid).collection("profile").doc("main");
    var snap = await ref.get();
    var now = new Date().toISOString();
    var data = {
      uid: user.uid,
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      updatedAt: now
    };
    if (!snap.exists) {
      data.createdAt = now;
      await ref.set(data);
    } else {
      await ref.set(data, { merge: true });
    }
  }

  function signInWithGoogle() {
    if (!auth) {
      return Promise.reject(new Error("Firebase belum siap / config belum diisi"));
    }
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    // Redirect lebih stabil di mobile / PWA daripada popup
    return auth.signInWithRedirect(provider);
  }

  function signInWithGooglePopup() {
    if (!auth) {
      return Promise.reject(new Error("Firebase belum siap / config belum diisi"));
    }
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    return auth.signInWithPopup(provider).then(function (result) {
      currentUser = result.user;
      return ensureUserProfile(result.user).then(function () {
        return result.user;
      });
    });
  }

  function signOut() {
    if (!auth) return Promise.resolve();
    return auth.signOut().then(function () {
      currentUser = null;
    });
  }

  function getUid() {
    return currentUser ? currentUser.uid : null;
  }

  function requireUser() {
    if (!currentUser) throw new Error("Belum login Firebase");
    return currentUser;
  }

  function onAuth(fn) {
    if (typeof fn !== "function") return function () {};
    listeners.push(fn);
    if (authReady) {
      try { fn(currentUser); } catch (e) {}
    }
    return function unsubscribe() {
      var i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function waitAuthReady() {
    return authReadyPromise;
  }

  function isReady() {
    return authReady && !!app && !isConfigPlaceholder();
  }

  function isLoggedIn() {
    return !!currentUser;
  }

  // Public API
  global.spxFirebase = {
    get app() { return app; },
    get auth() { return auth; },
    get db() { return db; },
    get storage() { return storage; },
    get currentUser() { return currentUser; },
    get authReady() { return authReady; },
    getUid: getUid,
    requireUser: requireUser,
    signInWithGoogle: signInWithGoogle,
    signInWithGooglePopup: signInWithGooglePopup,
    signOut: signOut,
    onAuth: onAuth,
    waitAuthReady: waitAuthReady,
    isReady: isReady,
    isLoggedIn: isLoggedIn,
    isConfigPlaceholder: isConfigPlaceholder,
    ensureUserProfile: ensureUserProfile,
    _config: firebaseConfig
  };

  // Auto-init saat script dimuat
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : this);

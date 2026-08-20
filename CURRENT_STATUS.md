# CURRENT STATUS

Project: SPX Express 12

CURRENT PHASE:
Phase 1 — Firebase Authentication foundation.

ALREADY PREPARED:
- firebase.js
- firebase-data.js
- firestore.rules
- integration instructions

CURRENT SOURCE:
- index.html
- localStorage is still the main application persistence
- Google OAuth/Drive remains in the old system
- photos currently use IndexedDB (ScanNotePhotoDB)

DO NOT YET:
- remove localStorage
- remove Google Drive
- rewrite save()
- migrate all data in one step
- finalize cross-device Anti Duplicate
- move photos without auditing the existing photo model

NEXT CHECKPOINT:
1. Create Firebase project.
2. Add Web App.
3. Enable Google provider.
4. Create Firestore.
5. Put real Firebase config into firebase.js.
6. Integrate Firebase auth into index.html.
7. Test login/logout on HP A.
8. Test same Google account on HP B.
9. Verify both devices resolve to the same Firebase UID.

Only after that: Phase 2 (Settings + Stores).

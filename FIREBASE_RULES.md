# Firebase security rules (copy/paste)

## 1) Firestore Rules

In Firebase Console → Firestore Database → Rules, paste:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null;
    }

    // Public read (your website pages)
    match /cars/{docId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }

    match /rentals/{docId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }

    match /parts/{docId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }

    // About form submissions: anyone can create, only admin can read
    match /aboutSubmissions/{docId} {
      allow create: if true;
      allow read, update, delete: if isAdmin();
    }

    // Everything else locked down
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 2) Storage Rules

In Firebase Console → Storage → Rules, paste:

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Public can view images used on the website
    match /royalmotors/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Block everything else
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```


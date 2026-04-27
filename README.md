# Pickle Champs 🥒

Pickleball session & score tracker for the Christchurch crew.

---

## Step 1 — Create a free Firebase project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `pickle-champs` → click through (no need for Google Analytics)
3. Once created, click the **Web icon `</>`** to add a web app
4. Give it a nickname (e.g. `pickle-champs-web`) → click **Register app**
5. Copy the `firebaseConfig` object — you'll need it in a moment

---

## Step 2 — Enable Firestore

1. In the Firebase console left sidebar → **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (allows open read/write — the app password handles access control)
4. Pick a region closest to NZ — **australia-southeast1** or **asia-southeast1**
5. Click **Enable**

---

## Step 3 — Paste your Firebase config

Open `firebase-config.js` and replace the placeholder values with your actual config:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "pickle-champs.firebaseapp.com",
  projectId: "pickle-champs",
  storageBucket: "pickle-champs.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## Step 4 — Push to GitHub

```bash
cd pickleball-app
git init
git add .
git commit -m "Initial pickleball app"
```

1. Go to [https://github.com/new](https://github.com/new) and create a new repo named `pickle-champs`
2. Copy the two push commands GitHub shows you and run them in the terminal

---

## Step 5 — Deploy to Vercel

1. Go to [https://vercel.com](https://vercel.com) and log in with GitHub
2. Click **Add New → Project**
3. Find and import your `pickle-champs` repo
4. Framework: **Other** (plain HTML/JS — no build needed)
5. Click **Deploy** — done!

Every time you push to GitHub, Vercel redeploys automatically.

---

## Password

The app password is **Champions** (case-sensitive).
Change it by editing line 3 of `app.js`:
```js
const PASSWORD = 'Champions';
```

---

## Data structure (Firestore)

| Collection | Fields |
|---|---|
| `players` | `name`, `country`, `createdAt` |
| `sessions` | `date`, `time`, `address`, `notes`, `createdAt` |
| `games` | `sessionId`, `team1[]`, `team2[]`, `score1`, `score2`, `createdAt` |

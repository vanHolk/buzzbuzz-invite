# 🐝 BuzzBuzz — Social Step Tracker

**BuzzBuzz** is a social fitness app that turns your daily steps into a shared adventure. Join a hive, compete on daily leaderboards, and keep your streak alive — one step at a time.

[![App Store](https://img.shields.io/badge/Download_on_the-App_Store-black?logo=apple&logoColor=white)](https://apps.apple.com/app/buzzbuzz)
[![Android](https://img.shields.io/badge/Coming_Soon-Google_Play-3DDC84?logo=google-play&logoColor=white)](#)

---

## 🔗 Hive Invite Page

This repository hosts the **BuzzBuzz hive invite landing page** — the link your hive queen shares to recruit new members.

**Live URL:** `https://vanholk.github.io/buzzbuzz-invite/landing.html`

When a BuzzBuzz user receives a hive invite link, this page:
- Shows the hive name, queen bee, and current member count
- Lets new users download the app directly (iOS App Store / Google Play)
- Deep-links existing users straight into the app to accept the invite

---

## 📱 About BuzzBuzz

| Feature | Description |
|---|---|
| 🏆 Daily Leaderboards | Compete with your hive on step count — resets every midnight |
| 🔥 Streaks | Keep your daily step streak alive and earn honey rewards |
| 🐝 Hive System | Join or create a hive of up to 8 members and chase collective goals |
| 🍯 Honey Economy | Earn honey for steps, streaks, and challenges — spend it in the Honey Shop |
| 🌈 Sunday Color Challenge | Weekly color-coded step challenge with anti-repeat variety |
| 🎨 Bee Skins | Customize your bee with unlockable skins (Cowboy, Emo, Goblin and more) |
| 📲 Push Notifications | Real-time leaderboard updates and challenge alerts |

---

## 🧠 How the Invite Flow Works

```
User taps invite link
        ↓
landing.html loads (this repo)
        ↓
App installed? → Deep link opens BuzzBuzz → Accept hive invite
        ↓
App not installed? → App Store / Google Play download prompt
```

The page uses **Universal Links** (iOS) and **App Links** (Android) to route existing users directly into the app without an extra tap.

---

## 🗂️ Repository Structure

```
buzzbuzz-invite/
├── landing.html        # Hive invite landing page
├── sitemap.xml         # XML sitemap for search engine indexing
└── README.md           # This file
```

---

## 🔍 SEO & Metadata

The landing page is optimized for:
- **Open Graph** tags (rich previews on iMessage, WhatsApp, Twitter/X, Slack)
- **Twitter Card** (`summary_large_image`) for X share previews
- **Structured Data** (`schema.org/MobileApplication`) for Google rich results
- **Canonical URL** to prevent duplicate-content signals
- Mobile-first responsive layout for fast Core Web Vitals scores

---

## 🌍 Localization Roadmap

BuzzBuzz is currently available in **English**. Invite pages for additional locales are planned:

- 🇰🇷 Korean (`/ko/`)
- 🇯🇵 Japanese (`/ja/`)
- 🇩🇪 German (`/de/`)

---

## 👩‍💻 Built By

Made with 🍯 by **Van** ([@vanholk](https://github.com/vanholk)), solo developer of BuzzBuzz.

> *"Every step counts. Every bee matters."*

---

## 📄 License

The invite page UI and assets are proprietary to BuzzBuzz. This repository is public for GitHub Pages hosting purposes only.

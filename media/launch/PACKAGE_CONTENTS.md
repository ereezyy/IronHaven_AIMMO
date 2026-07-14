# Package contents inventory

Generated with the media pack on **2026-07-14**.

## Documents

```
media/
├── README.md
├── RELEASE_NOTES_v1.0.0.md
├── press-kit/
│   ├── 00_INDEX.md
│   ├── FACT_SHEET.md
│   ├── PRESS_RELEASE.md
│   ├── BOILERPLATE.md
│   ├── BRAND_GUIDELINES.md
│   └── ASSET_MANIFEST.md
├── copy/
│   ├── TAGLINES.md
│   ├── SOCIAL_POSTS.md
│   ├── PRODUCT_HUNT.md
│   ├── REDDIT_HN.md
│   ├── EMAIL_ANNOUNCEMENT.md
│   ├── DISCORD_ANNOUNCEMENT.md
│   └── STORE_LISTING.md
├── video/
│   ├── TRAILER_15s.md
│   ├── TRAILER_30s.md
│   ├── TRAILER_90s.md
│   └── CAPTURE_SHOT_LIST.md
├── visual/
│   ├── SCREENSHOT_CHECKLIST.md
│   └── IMAGE_PROMPTS.md
├── launch/
│   ├── LAUNCH_CHECKLIST.md
│   ├── CALENDAR.md
│   ├── FAQ.md
│   └── PACKAGE_CONTENTS.md
└── assets/
    ├── brand/          (logo, banner, title, city, beacon)
    ├── key-art/        (generated marketing stills)
    ├── screenshots/    (capture here)
    └── social/         (exports here)
```

## Zip for external press

From repo root:

```powershell
Compress-Archive -Path media\* -DestinationPath IronHaven_v1.0.0_MediaKit.zip -Force
```

Or:

```bash
cd media && zip -r ../IronHaven_v1.0.0_MediaKit.zip .
```

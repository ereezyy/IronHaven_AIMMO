# IronHaven AIMMO — Release Notes v1.0.0

**Release date:** 2026-07-14 (pack freeze)  
**Build channel:** Production — https://ironhaven-aimmo.vercel.app  
**Codename:** Street Open

---

## Headline

**IronHaven is open.** A free browser cyberpunk MMO with live multiplayer, character creation, district pressure, and optional IronHaven Pass.

---

## What's in 1.0

### Core loop

- Enter the city in seconds — **no download**
- Create a callsign + archetype (Runner / Enforcer / Ghost / Fixer)
- Modular avatar parts + appearance sync to other players
- Explore districts, take objectives, earn money and rep
- Fight, drive, harvest, fish, hunt, and hit the black market

### Multiplayer

- Supabase Realtime player presence & position sync
- Character appearance + avatar parts replicated
- Global / local chat channels
- Leaderboards & seasonal ranking panel
- Dynamic world events tied to territory + combat

### Systems

- Rapier kinematic character controller + building collision
- Procedural archetype silhouettes + hit flinch / death collapse
- Skills, progression, economy, shops, missions
- Factions: Neon Syndicate, Chrome Guard, Dock Rats
- Police / wanted escalation, vehicles, weapons
- Day/night, weather, atmosphere VFX
- AI NPC dialogue architecture (provider-configurable)

### Monetization

- **IronHaven Pass** — $1.99/week (Stripe live)
- Success redirect + webhook-backed pass status
- Free core play preserved

### Platform

- React 18 · TypeScript · Vite · Three.js / R3F
- Zustand state · Supabase backend · Vercel deploy
- Stripe Pass APIs on Vercel serverless

---

## Known limitations (be honest in marketing)

- Content density is **early live** — expect systems-first polish over AAA art density
- Mobile is not the primary target (desktop WebGL recommended)
- AI NPCs depend on configured provider keys / fallbacks
- Some systems are local-first with cloud sync where available

---

## Upgrade path (post-1.0 themes)

1. Deeper avatar catalog + animation polish
2. Stronger guild / party tooling
3. Mission content packs by district
4. Performance pass for low-end GPUs
5. Pass reward track expansion

---

## Credits

- **Creator:** ereezyy
- **Repo:** https://github.com/ereezyy/IronHaven_AIMMO
- **Third-party art:** see `public/ATTRIBUTION.md`

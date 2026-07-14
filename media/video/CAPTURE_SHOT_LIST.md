# Capture shot list (record from live build)

**Build:** https://ironhaven-aimmo.vercel.app  
**Tools:** OBS Studio (game + display capture), 1080p60, cursor hidden when possible  
**Folder:** `media/assets/screenshots/` for stills · raw video local until edit

---

## Pre-flight

- [ ] Fresh profile / clean callsign (no private info)
- [ ] HUD readable (not spam-toasted)
- [ ] Night lighting preferred
- [ ] Disable desktop notifications
- [ ] 16:9 window or borderless

---

## Video clips (name · length · action)

| #   | Filename                 | Len   | Action                                         |
| --- | ------------------------ | ----- | ---------------------------------------------- |
| V01 | `clip_intro_fly.mp4`     | 8–15s | Opening cinematic / city intro                 |
| V02 | `clip_creator.mp4`       | 20s   | Full creator flow, pick 2 archetypes           |
| V03 | `clip_spawn_walk.mp4`    | 15s   | Spawn, walk, look at neon                      |
| V04 | `clip_combat.mp4`        | 20s   | Clean fight, hit flinch visible                |
| V05 | `clip_vehicle.mp4`       | 15s   | Enter vehicle, short drive                     |
| V06 | `clip_multiplayer.mp4`   | 20s   | 2 clients if possible side-by-side or in-world |
| V07 | `clip_chat_event.mp4`    | 12s   | Chat send + world event banner                 |
| V08 | `clip_pass_ui.mp4`       | 8s    | Open Pass panel only (no checkout PII)         |
| V09 | `clip_death_respawn.mp4` | 10s   | Death collapse → recover                       |
| V10 | `clip_skyline_hold.mp4`  | 6s    | Static beauty hold for end card                |

---

## Still screenshots (PNG)

| #   | Filename                      | Composition                         |
| --- | ----------------------------- | ----------------------------------- |
| S01 | `01_hero_city_skyline.png`    | Rule-of-thirds skyline, no giant UI |
| S02 | `02_character_creator.png`    | Full creator, archetype selected    |
| S03 | `03_avatar_parts.png`         | Close-ish character + parts UI      |
| S04 | `04_street_combat.png`        | Mid combat, health visible          |
| S05 | `05_vehicle_chase.png`        | Motion, street lines                |
| S06 | `06_multiplayer_presence.png` | 2+ characters framed                |
| S07 | `07_faction_district.png`     | Faction color readable              |
| S08 | `08_pass_panel.png`           | Pass UI centered                    |
| S09 | `09_hud_full.png`             | Healthy HUD layout                  |
| S10 | `10_world_event.png`          | Event banner + world                |

---

## Two-client multiplayer capture tips

1. Two browser profiles or one browser + one incognito.
2. Different callsigns / colors.
3. Stand 5–15m apart so both silhouettes read.
4. Wave camera past both for “shared city” proof.

## Privacy

Never capture real Stripe receipts, emails, API keys, or `.env` contents.

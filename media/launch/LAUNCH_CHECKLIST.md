# Launch checklist — IronHaven v1.0

## T-7 days

- [ ] Production health: https://ironhaven-aimmo.vercel.app returns 200
- [ ] Pass API smoke: `/api/stripe-pass-status`, webhook GET ok
- [ ] Supabase project healthy / realtime on
- [ ] Capture screenshots S01–S10
- [ ] Capture trailer clips V01–V10
- [ ] Edit 15s + 30s trailers
- [ ] Export OG image 1200×630
- [ ] Prepare PH gallery (if launching PH)
- [ ] Draft posts reviewed (no broken links)
- [ ] UTM plan ready (`utm_source` per channel)

## T-1 day

- [ ] Soft share to 3 trusted players for last bugs
- [ ] Pin GitHub release notes / tag `v1.0.0` if desired
- [ ] Queue social posts (do not publish early)
- [ ] Discord announcement drafted
- [ ] Support path clear (GitHub issues)

## Launch day (T0)

### Hour 0

- [ ] Final prod smoke (load game, move, open creator)
- [ ] Publish GitHub Release with `RELEASE_NOTES_v1.0.0.md`
- [ ] Tweet / X primary post
- [ ] Discord #announcements
- [ ] LinkedIn post

### Hour +1–3

- [ ] Reddit (1–2 subs max first wave)
- [ ] Show HN (if weekday morning US)
- [ ] Product Hunt go-live (if scheduled)
- [ ] Reply to all comments

### Hour +6–12

- [ ] Second social wave (thread / clip)
- [ ] Email list send
- [ ] Monitor errors / Vercel logs / Stripe

## T+1 to T+7

- [ ] Publish “what we heard” patch note
- [ ] Follow-up email / Discord poll
- [ ] Clip best user footage (with permission)
- [ ] Fix P0 bugs only; schedule features

## Success metrics (define yours)

| Metric                      | Target (example) |
| --------------------------- | ---------------- |
| Unique play sessions (7d)   | **\_**           |
| Multiplayer concurrent peak | **\_**           |
| Pass conversions            | **\_**           |
| GitHub stars delta          | **\_**           |
| Bug reports filed / fixed   | **\_**           |

## Kill switches

- Stripe issue → disable Pass CTA copy, keep free play
- Multiplayer outage → post status, play offline systems still work
- Exploit → hotpatch + honest status update

## Links

| Resource  | URL                                        |
| --------- | ------------------------------------------ |
| Game      | https://ironhaven-aimmo.vercel.app         |
| Repo      | https://github.com/ereezyy/IronHaven_AIMMO |
| Ship ops  | `/SHIP.md`                                 |
| This pack | `/media`                                   |

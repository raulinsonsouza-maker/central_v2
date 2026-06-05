---
name: Viewer-triggered sync pattern
description: How to refresh per-entity data on page open without a cron, safely
---

When a daily cron can't run (see replit-deployment-constraint.md), refresh an
entity's data when someone opens its page, instead of on a schedule.

Pattern that avoids the obvious pitfalls (slow page, API hammering, dup runs):
- Fire the sync **in the background** (fire-and-forget `fetch` in a mount effect,
  guarded by a ref so it runs once per id). Never block render on it.
- Decide whether to actually run **server-side**, not client-side. Use an **atomic
  conditional claim**: `updateMany({ where: { id, OR:[lastSyncAt null, lastSyncAt <
  threshold] }, data: { lastSyncAt: now } })`. If `count===0`, skip. This both
  throttles (staleness window) and acts as a cross-instance lock on autoscale.
- Set the claim timestamp **before** running the sync. Tradeoff: a failed sync won't
  retry until the window passes — deliberate, prioritizes not hammering a failing
  upstream. A manual "refresh now" button bypasses the throttle (call without the
  background flag).
- Keep background errors silent (public/portal viewers shouldn't see error UI);
  surface errors only for the manual button.

**Limitations to call out to the user:** entities nobody opens never refresh, and
side-effects that aren't viewer-driven (e.g. daily alert emails) still need a real
scheduled job.

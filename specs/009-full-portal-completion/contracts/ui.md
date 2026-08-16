# Contract: Care-loop UI

**Feature**: `009-full-portal-completion` | **Date**: 2026-08-13

No new visual system. Reuse patient/doctor portal tokens. EN + AR (RTL).

## Doctor hours

- Schedule area includes Weekly hours editor: seven weekdays, start/end time, timezone, unavailable dates.
- Save confirmation; validation errors inline.
- Empty hours: copy that patients cannot book until hours are published.
- Changing hours does not remove existing confirmed visits.

## Patient booking

- Doctor profile booking grid lists only 30-minute offers for the next 14 days.
- Empty state: no times available -- never a fake 9-5 grid.
- Stub availability note must be removed.
- Upcoming includes checked-in and in-progress visits with join CTA when the video window is open.

## Video

- Live adapter: existing LiveKit conference.
- Demo adapter: banner "Demo video -- not a live call" (EN/AR). Same room metadata. Hide Admit. Hide in-call chat.
- Join remains visible inside the join window.

## Payments

- Confirm booking has no pay step.
- Payments list must not present unlabeled Pay now as a real card charge. Remove or mark Demo.

## Public

- Login / Register / Book CTAs stay in-app (auth or patient doctor page).

## Honesty rule

Any remaining control on the happy path that cannot perform its label is hidden or disabled with the same honest pattern as demo video.
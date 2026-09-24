# EventForge

**An event platform built around scarcity and conflict, not just listings and signup forms.**

Most event-management projects reduce to _organizer posts event → user registers → user shows up_. EventForge treats **seats, time slots, venues, volunteer shifts, and a person's own calendar as constrained resources** that have to be allocated fairly and without conflicts. That framing is what makes data structures and algorithms earn their place in the codebase instead of being bolted on.

Events can be anything: meetups, workshops, concerts, conferences, sports, community gatherings. Nothing is hardcoded to a campus.

---

## Features

### For participants

- **Discover events** with ranked search, autocomplete, category/city/date filters, and **"Near me"** geolocation search
- **Personalised "Picked for you"** recommendations based on interests, past attendance, and your own ratings
- **Register individually or as a team** (one shared QR per team, one QR per person for individual events)
- **Waitlist with fair auto-promotion** when a seat opens up
- **Schedule conflict detection**: you're warned if a new registration overlaps an event you're already attending
- **QR tickets** for entry, plus **`.ics` calendar export**
- **Rate events** after they end, which feeds back into recommendations
- **Volunteer** for events by offering your availability windows

### For organizers

- Create and manage events with categories, tags, capacity, venue, location, and team-size rules
- **Venue double-booking protection** with suggestions for the nearest free time slots
- Registrant list with **manual waitlist prioritisation**
- **QR check-in** with signed tickets and per-event ticket checkers (volunteers who can scan for one event only)
- **Analytics**: signups over time, peak signup hour, drop-off rate, capacity utilisation, check-in rate, and where signups came from
- **Volunteer shift scheduling** with automatic optimal assignment
- **Multi-session agendas** with prerequisites and no-overlap tracks
- Event lifecycle: `published → ongoing → completed`, with waitlist auto-promotion when capacity is raised
- AI-assisted event description drafting

---

## Where the data structures and algorithms live

| Feature                          | Structure / Algorithm                                                                | Why                                                                                                     | Complexity                          |
| -------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Waitlist promotion               | **Binary min-heap** ordered by priority, then registration time                      | Models "who gets the next seat" including weighted priority; also skips anyone who now has a time clash | build O(n), pop O(log n)            |
| Ranked results & recommendations | **Size-k heap** (top-k selection)                                                    | Only the best k are needed, so the full list is never sorted                                            | O(n log k)                          |
| Search                           | **Inverted index** (word → events) + **trie** for autocomplete and prefix expansion  | Avoids scanning every event and running regexes on each keystroke                                       | O(1) term lookup, O(L + m) prefix   |
| "Events near me"                 | **Uniform grid spatial index** + haversine distance                                  | Only cells the search circle touches are visited                                                        | O(cells in radius + points in them) |
| Venue free-slot suggestions      | **Sort-and-sweep interval merge**                                                    | Finds gaps in a venue's schedule and the closest ones that fit an event's length                        | O(n log n)                          |
| Schedule / venue conflict check  | Interval overlap test `a.start < b.end && b.start < a.end` as an indexed range query | Correct at any scale; the DB does the filtering                                                         | O(log n + k)                        |
| Volunteer ↔ shift assignment     | **Hopcroft–Karp** maximum bipartite matching                                         | Beats greedy assignment on constrained availability                                                     | O(E√V)                              |
| Session prerequisites            | **Topological sort** (Kahn's, heap tie-break by start time) + DFS prerequisite chain | Valid attendance order, cycle detection, "what must I attend first?"                                    | O(V log V + E)                      |
| QR check-in                      | HMAC-signed token + **atomic conditional update**                                    | Duplicate scans and racing scanners can never both succeed                                              | O(1)                                |
| Recommendations                  | Weighted taste profile + **Bayesian-smoothed organizer ratings**                     | A single 5-star review doesn't outrank fifty 4.6s                                                       | O(n)                                |

All of these live in `backend/helpers/` as pure, dependency-free modules with unit tests.

---

## Tech stack

- **Frontend:** React, React Router, Vite, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB with Mongoose
- **Auth:** JWT with role-based access (`participant`, `organizer`, `admin`)
- **QR:** `qrcode` (generation) and `@yudiel/react-qr-scanner` (scanning)
- **AI:** Google Gemini for description drafting

---

## Project structure

```
eventforge/
├── backend/
│   ├── APIs/          # Express routers (one per resource)
│   ├── models/        # Mongoose schemas
│   ├── helpers/       # Pure algorithms & data structures (heap, trie, search index, geo grid, matching, ...)
│   ├── services/      # DB-backed logic shared across routes (seat allocation, venue checks, search cache)
│   ├── middleware/    # Auth / role checks
│   ├── test/          # Unit tests for the algorithm modules
│   └── server.js
└── frontend/
    └── src/
        ├── pages/       # Route-level screens
        ├── components/  # Reusable UI
        ├── context/     # Auth state
        ├── api/         # Axios instance
        └── utils/       # Time helpers
```

---

## Getting started

### Prerequisites

- Node.js 18+
- A MongoDB instance (local or Atlas)
- A Gemini API key _(optional, only for AI description drafting)_

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env     # then fill in the values
npm run dev
```

`.env` needs your MongoDB connection string, a JWT secret, a `TICKET_SECRET` (used to sign QR tickets, so make it long and random), and optionally your Gemini key. See `.env.example` for the exact variable names.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints. Make sure the frontend's API base URL points at your backend.

### 3. Run the tests

```bash
cd backend
npm test
```

Runs the algorithm test suite on Node's built-in test runner. Several tests compare against brute-force answers on random inputs (heap vs `Array.sort`, grid search vs full haversine scan, Hopcroft–Karp vs a reference matching, free slots vs a minute-by-minute scan).

---

## How key parts work

### QR check-in

The QR code never contains personal data. It encodes a random **ticket ID plus an HMAC signature**. The scanner sends that to the server, which verifies the signature, looks up the registration, and only then returns attendee details.

- The first successful scan marks the ticket checked in with a timestamp, using a single conditional update (`checkedIn: false → true`) so two scanners hitting the same ticket at once produce exactly one winner.
- A second scan returns **"Already checked in"** with the original time.
- Only the event's organizer, its assigned checkers, or an admin can scan for that event.
- Individual registrations get their own QR. A team gets **one shared QR**, and scanning it shows the whole member list.

### Waitlist

When an event is full, registrations join the waitlist. When a confirmed seat is freed, the seat is **transferred** directly to the best eligible waitlisted registration, so a new signup can't slip in ahead of the queue. "Best" means highest organizer-set priority, then earliest registration. Anyone who has since booked a clashing event is skipped. Raising an event's capacity pulls people off the waitlist into the new seats.

### Venue double-booking

Every event stores a normalised venue+city key. Creating or rescheduling an event checks for overlapping live events at the same venue. On a clash the API returns the conflict **and the nearest free time slots** long enough for the event, which the UI offers as one-click options.

### Recommendations

A taste profile is built from stated interests and attended events, weighted by how the user rated them (5★ boosts a topic, 1★ pushes it down). Candidate events are scored on topic match, organizer reputation (Bayesian-smoothed), and a light popularity signal. New users with no history fall back to reputation and popularity rather than random order. Each recommendation shows _why_ it was picked.

---

## API overview

| Area         | Examples                                                                                                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth & users | `POST /user-api/register`, `POST /user-api/login`, `GET /user-api/me`, `PATCH /user-api/interests`                                                                                                                    |
| Events       | `POST /event-api/create`, `PUT /event-api/:id`, `PATCH /event-api/:id/start`, `PATCH /event-api/:id/complete`, `GET /event-api/:id/analytics`, `GET /event-api/:id/calendar.ics`, `GET /event-api/venue-availability` |
| Search       | `GET /search-api/events`, `GET /search-api/suggest`, `GET /search-api/facets`                                                                                                                                         |
| Registration | `POST /register-api/:eventId`, `POST /register-api/team/:eventId`, `DELETE /register-api/:id`, `PATCH /register-api/:id/priority`                                                                                     |
| Tickets      | `GET /ticket-api/qr/:registrationId`, `POST /ticket-api/verify`                                                                                                                                                       |
| Volunteers   | `POST /volunteer-api/:eventId/shifts`, `POST /volunteer-api/:eventId/apply`, `POST /volunteer-api/:eventId/assign`                                                                                                    |
| Sessions     | `POST /session-api/:eventId`, `GET /session-api/:eventId`, `GET /session-api/:eventId/path/:sessionId`                                                                                                                |

---

## Design decisions and known limits

- **Free events only for now.** Events carry a `price` field so paid tiers can be added later without reshaping the schema. There is no payment integration.
- **Search index is in memory** and per server process, rebuilt on event changes and every minute. Seat counts are always re-read fresh from the database. Running multiple instances would call for a shared cache.
- **Geo search doesn't wrap the ±180° meridian.**
- **Each volunteer takes at most one shift.** This keeps assignment a clean bipartite matching problem.
- **Times are sent as ISO timestamps** from the browser, so events land at the organizer's intended local time regardless of server timezone.
- Deliberately left out as over-engineering: chatbot Q&A, blockchain ticketing, in-house video hosting, payment gateways.

## Roadmap

- Paid ticket tiers and a payment flow
- Recurring events
- Organizer verification and trust badges
- Notifications (email / in-app) for reminders and waitlist promotions
- Shared cache for multi-instance search

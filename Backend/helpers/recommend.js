// Pure scoring logic for "Picked for you" — no DB access, so it's unit-testable.
//
//   score = content match + organizer reputation + 0.5 * fill rate
//
//   content match   how well the event's category/tags line up with what this user likes
//   reputation      organizer's average rating, shrunk toward the mean when there are few reviews
//   fill rate       registeredCount / capacity — light social proof, and the cold-start fallback

const norm = (s) => String(s).trim().toLowerCase()
const NEUTRAL_RATING = 3.5

// How much an attended event should teach us about the user's taste.
// Unrated = a mild +1. Rated: 5→+3, 4→+2, 3→+1, 2→0, 1→-1 (a bad experience pushes that topic down).
export const ratingAffinity = (rating) => (rating == null ? 1 : rating - 2)

// Bayesian average: with few reviews the result stays near the prior, so one 5-star
// review doesn't outrank an organizer with fifty 4.6s.
export function bayesRating(avg, n, prior = NEUTRAL_RATING, priorWeight = 3) {
    return (avg * n + prior * priorWeight) / (n + priorWeight)
}

// history: [{ event: { category, tags }, rating: number | null }] — events the user is confirmed for
// returns Map(term → weight)
export function buildProfile(interests = [], history = []) {
    const weights = new Map()
    const add = (term, w) => {
        if (!term) return
        const k = norm(term)
        weights.set(k, (weights.get(k) || 0) + w)
    }
    interests.forEach(t => add(t, 2))
    for (const { event, rating } of history) {
        const w = ratingAffinity(rating)
        add(event.category, w)
        ;(event.tags || []).forEach(t => add(t, w))
    }
    return weights
}

// organizerStats: Map(organizerId string → { avg, n }) — optional
export function scoreEvent(event, profile, organizerStats) {
    const terms = [...new Set([event.category, ...(event.tags || [])].filter(Boolean).map(norm))]

    let content = 0
    const matched = []
    for (const term of terms) {
        const w = profile.get(term) || 0
        content += w
        if (w > 0) matched.push([term, w])
    }
    matched.sort((a, b) => b[1] - a[1])

    const stats = organizerStats?.get(String(event.organizer))
    const reputation = stats ? bayesRating(stats.avg, stats.n) - NEUTRAL_RATING : 0
    const fill = Math.min(1, Math.max(0, (event.registeredCount || 0) / (event.capacity || 1)))

    return {
        score: content + reputation + 0.5 * fill,
        matchedOn: matched.slice(0, 3).map(([term]) => term)
    }
}

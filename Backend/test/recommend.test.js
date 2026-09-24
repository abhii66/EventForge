import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildProfile, scoreEvent, bayesRating, ratingAffinity } from '../helpers/recommend.js'
import { normalizeTags } from '../helpers/tags.js'
import { topK } from '../helpers/topK.js'

const ev = (category, tags = [], extra = {}) => ({ category, tags, organizer: 'o1', capacity: 100, registeredCount: 0, ...extra })

test('normalizeTags: lowercases, trims, dedupes, caps, accepts strings and arrays', () => {
    assert.deepEqual(normalizeTags(' Music, OUTDOOR ,music,, '), ['music', 'outdoor'])
    assert.deepEqual(normalizeTags(['A', 'a', 5, null, 'b']), ['a', 'b'])
    assert.equal(normalizeTags(Array.from({ length: 30 }, (_, i) => 't' + i)).length, 10)
    assert.deepEqual(normalizeTags(undefined), [])
})

test('stated interests and category/tag matching are case-insensitive', () => {
    const profile = buildProfile(['Music'])
    const { score, matchedOn } = scoreEvent(ev('MUSIC', ['Jazz']), profile)
    assert.ok(score >= 2)
    assert.deepEqual(matchedOn, ['music'])
})

test('ratings steer taste: loved topics rise, disliked topics sink', () => {
    const history = [
        { event: ev('tech', ['ai']), rating: 5 },       // +3
        { event: ev('sports', ['cricket']), rating: 1 } // -1
    ]
    const profile = buildProfile([], history)
    const tech = scoreEvent(ev('tech', ['ai']), profile).score
    const sports = scoreEvent(ev('sports', ['cricket']), profile).score
    const unknown = scoreEvent(ev('cooking'), profile).score
    assert.ok(tech > unknown && unknown > sports)
    assert.equal(ratingAffinity(null), 1)
    assert.deepEqual([1, 2, 3, 4, 5].map(ratingAffinity), [-1, 0, 1, 2, 3])
})

test('an unrated attended event counts as mild interest', () => {
    const profile = buildProfile([], [{ event: ev('art'), rating: null }])
    assert.equal(profile.get('art'), 1)
})

test('bayesRating: few reviews stay near the prior, many reviews dominate', () => {
    assert.ok(bayesRating(5, 1) < bayesRating(5, 50))
    assert.ok(bayesRating(5, 1) < 4)              // one 5-star review isn't "excellent"
    assert.ok(bayesRating(4.6, 50) > bayesRating(5, 1)) // fifty 4.6s beat a single 5
    assert.equal(bayesRating(4, 0), 3.5)          // no reviews → exactly the prior
})

test('organizer reputation lifts an otherwise identical event', () => {
    const stats = new Map([['good', { avg: 4.8, n: 40 }], ['bad', { avg: 2, n: 40 }]])
    const profile = buildProfile([])
    const good = scoreEvent(ev('x', [], { organizer: 'good' }), profile, stats).score
    const bad = scoreEvent(ev('x', [], { organizer: 'bad' }), profile, stats).score
    const none = scoreEvent(ev('x', [], { organizer: 'new' }), profile, stats).score
    assert.ok(good > none && none > bad)
})

test('cold start (no interests, no history) falls back to reputation and popularity, not randomness', () => {
    const profile = buildProfile([], [])
    const stats = new Map([['great', { avg: 4.9, n: 30 }]])
    const events = [
        ev('a', [], { organizer: 'new', registeredCount: 5 }),
        ev('b', [], { organizer: 'great', registeredCount: 5 }),
        ev('c', [], { organizer: 'new', registeredCount: 90 })
    ].map((e, i) => ({ ...e, id: i }))
    const ranked = topK(events, 3, e => scoreEvent(e, profile, stats).score).map(e => e.id)
    assert.deepEqual(ranked, [1, 2, 0])
})

test('matchedOn lists the strongest matching terms, at most three', () => {
    const profile = buildProfile(['a', 'b', 'c', 'd'], [{ event: ev('b'), rating: 5 }]) // b=5, others=2
    const { matchedOn } = scoreEvent(ev('b', ['a', 'c', 'd']), profile)
    assert.equal(matchedOn.length, 3)
    assert.equal(matchedOn[0], 'b')
})

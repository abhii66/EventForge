import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MinHeap } from '../helpers/MinHeap.js'
import { topK } from '../helpers/topK.js'
import { waitlistCandidates } from '../helpers/waitlist.js'
import { escapeRegex } from '../helpers/escapeRegex.js'

const drain = (h) => { const out = []; while (h.size) out.push(h.pop()); return out }

test('MinHeap drains in sorted order (push and heapify constructors)', () => {
    for (let t = 0; t < 300; t++) {
        const arr = Array.from({ length: Math.floor(Math.random() * 60) }, () => Math.floor(Math.random() * 20))
        const sorted = [...arr].sort((a, b) => a - b)
        assert.deepEqual(drain(new MinHeap((a, b) => a - b, arr)), sorted)
        const pushed = new MinHeap(); arr.forEach(x => pushed.push(x))
        assert.deepEqual(drain(pushed), sorted)
    }
    assert.equal(new MinHeap().pop(), undefined)
})

test('topK matches "sort descending, take k" with ties resolved by input order', () => {
    for (let t = 0; t < 500; t++) {
        const items = Array.from({ length: Math.floor(Math.random() * 40) }, (_, i) => ({ i, s: Math.floor(Math.random() * 6) }))
        const k = Math.floor(Math.random() * 12)
        const expected = [...items].sort((a, b) => b.s - a.s || a.i - b.i).slice(0, k)
        assert.deepEqual(topK(items, k, x => x.s), expected)
    }
    assert.deepEqual(topK([1, 9, 3, 7], 2, x => x), [9, 7])
    assert.deepEqual(topK([1, 2], 0, x => x), [])
})

test('waitlist promotes highest priority first, then earliest registration', () => {
    const t0 = Date.parse('2026-10-01T10:00:00Z')
    const mk = (id, p, min) => ({ id, priorityScore: p, registeredAt: new Date(t0 + min * 60000) })
    const list = [mk('late-vip', 5, 30), mk('early', 0, 1), mk('mid', 0, 10), mk('early-vip', 5, 20), mk('none', undefined, 5)]
    assert.deepEqual([...waitlistCandidates(list)].map(r => r.id), ['early-vip', 'late-vip', 'early', 'none', 'mid'])
    // all-zero priorities degrade to plain FIFO
    assert.deepEqual([...waitlistCandidates([mk('a', 0, 3), mk('b', 0, 1), mk('c', 0, 2)])].map(r => r.id), ['b', 'c', 'a'])
})

test('escapeRegex makes user search text literal', () => {
    assert.equal(new RegExp(escapeRegex('a.b*c(')).test('a.b*c('), true)
    assert.equal(new RegExp(escapeRegex('.*')).test('anything'), false)
})

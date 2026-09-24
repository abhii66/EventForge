// Accepts an array or a comma-separated string. Returns lowercase, trimmed, de-duplicated tags (max 10, 30 chars each)
// so "Music", " music" and "MUSIC" are one tag and the recommender can match on them.
export function normalizeTags(input, max = 10) {
    const list = Array.isArray(input) ? input : typeof input === 'string' ? input.split(',') : []
    const out = []
    for (const t of list) {
        if (typeof t !== 'string') continue
        const v = t.trim().toLowerCase().slice(0, 30)
        if (v && !out.includes(v)) out.push(v)
        if (out.length >= max) break
    }
    return out
}

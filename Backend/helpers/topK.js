import { MinHeap } from './MinHeap.js'

// Top-k selection with a size-k min-heap: O(n log k) time, O(k) space.
// The heap's root is the *weakest* of the current top k, so each new item
// only needs one comparison against the root to know whether it belongs.
// Ties go to the item that appeared earlier in `items`, so results are deterministic.
export function topK(items, k, scoreFn) {
    if (k <= 0) return []

    // "smaller" = weaker: lower score, or same score but appeared later
    const heap = new MinHeap((a, b) => a.score - b.score || b.idx - a.idx)

    let idx = 0
    for (const item of items) {
        const entry = { score: scoreFn(item), idx: idx++, item }
        if (heap.size < k) {
            heap.push(entry)
        } else if (heap.compare(entry, heap.peek()) > 0) {
            heap.pop()
            heap.push(entry)
        }
    }

    // drain weakest → strongest, then reverse for best-first
    const out = []
    while (heap.size) out.push(heap.pop().item)
    return out.reverse()
}

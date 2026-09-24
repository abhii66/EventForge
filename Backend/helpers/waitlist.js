import { MinHeap } from './MinHeap.js'

// Who gets the next free seat: highest priorityScore first,
// earliest registeredAt breaks ties (so with all-zero scores it's plain FIFO).
export const waitlistOrder = (a, b) =>
    (b.priorityScore || 0) - (a.priorityScore || 0) ||
    new Date(a.registeredAt) - new Date(b.registeredAt)

// Yields waitlisted registrations in promotion order without sorting the whole list up front.
// Build is O(n); each candidate we actually look at costs O(log n).
// That matters because we often stop after the first eligible candidate.
export function* waitlistCandidates(waitlisted) {
    const heap = new MinHeap(waitlistOrder, waitlisted)
    while (heap.size) yield heap.pop()
}

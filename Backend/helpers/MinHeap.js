// Binary min-heap backed by an array.
// `compare(a, b)` < 0 means `a` should leave the heap before `b`.
//   push: O(log n)   pop: O(log n)   peek: O(1)   heapify(n items): O(n)
export class MinHeap {
    constructor(compare = (a, b) => a - b, items = []) {
        this.compare = compare
        this.items = items.slice()
        // bottom-up heapify: O(n), cheaper than n pushes
        for (let i = (this.items.length >> 1) - 1; i >= 0; i--) this.#down(i)
    }

    get size() { return this.items.length }

    peek() { return this.items[0] }

    push(value) {
        this.items.push(value)
        this.#up(this.items.length - 1)
    }

    pop() {
        if (!this.items.length) return undefined
        const top = this.items[0]
        const last = this.items.pop()
        if (this.items.length) {
            this.items[0] = last
            this.#down(0)
        }
        return top
    }

    #up(i) {
        const { items, compare } = this
        while (i > 0) {
            const parent = (i - 1) >> 1
            if (compare(items[i], items[parent]) >= 0) break
            ;[items[i], items[parent]] = [items[parent], items[i]]
            i = parent
        }
    }

    #down(i) {
        const { items, compare } = this
        const n = items.length
        while (true) {
            const left = 2 * i + 1
            const right = left + 1
            let smallest = i
            if (left < n && compare(items[left], items[smallest]) < 0) smallest = left
            if (right < n && compare(items[right], items[smallest]) < 0) smallest = right
            if (smallest === i) break
            ;[items[i], items[smallest]] = [items[smallest], items[i]]
            i = smallest
        }
    }
}

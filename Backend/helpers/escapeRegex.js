// user text -> literal regex source (stops `.*`-style patterns / ReDoS via the search box)
export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

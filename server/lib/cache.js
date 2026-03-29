"use strict";

class TTLCache {
  constructor(ttl, maxSize) {
    this.ttl     = ttl;
    this.maxSize = maxSize;
    this.map     = new Map();
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) { this.map.delete(key); return undefined; }
    return entry.data;
  }

  set(key, data) {
    if (this.map.size >= this.maxSize) {
      const now = Date.now();
      for (const [k, v] of this.map.entries()) {
        if (now > v.expiry) this.map.delete(k);
      }
      // If still over limit, drop oldest entries
      if (this.map.size >= this.maxSize) {
        const it = this.map.keys();
        while (this.map.size >= this.maxSize) {
          const oldest = it.next();
          if (oldest.done) break;
          this.map.delete(oldest.value);
        }
      }
    }
    this.map.set(key, { data, expiry: Date.now() + this.ttl });
  }
}

module.exports = TTLCache;

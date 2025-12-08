// backend/services/jwtBloom.ts
// deno-lint-ignore-file

// ---- Simple Bloom Filter ----
class BloomFilter {
  size = 1024;
  bits: boolean[] = new Array(1024).fill(false);

  private hash1(str: string) {
    let hash = 0;
    for (const c of str) {
      hash = (hash * 31 + c.charCodeAt(0)) % this.size;
    }
    return hash;
  }

  private hash2(str: string) {
    let hash = 0;
    for (const c of str) {
      hash = (hash * 17 + c.charCodeAt(0)) % this.size;
    }
    return hash;
  }

  add(str: string) {
    const h1 = this.hash1(str);
    const h2 = this.hash2(str);
    this.bits[h1] = true;
    this.bits[h2] = true;
  }

  has(str: string) {
    const h1 = this.hash1(str);
    const h2 = this.hash2(str);
    return this.bits[h1] && this.bits[h2];
  }
}

// Uygulama için tek bir global Bloom instance
const tokenBloom = new BloomFilter();

// Dışarıya sadece bu fonksiyonları açıyoruz:
export function blacklistToken(token: string | null | undefined) {
  if (!token) return;
  tokenBloom.add(token);
}

export function isTokenBlacklisted(token: string | null | undefined): boolean {
  if (!token) return false;
  return tokenBloom.has(token);
}

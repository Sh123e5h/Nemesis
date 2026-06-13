/**
 * NEMESIS UTILITY ARCHITECTURE (v1.0.0)
 * Core functional helpers for advanced identity and data processing.
 */



/**
 * MD5 Hashing Utility (RFC 1321)
 * A lightweight, high-performance implementation for identity hashing (Gravatar).
 */
export function md5(s: string): string {
    const k: number[] = [];
    for (let i = 0; i < 64; i++) {
        k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
    }

    let a = 0x67452301;
    let b = 0xefcdab89;
    let c = 0x98badcfe;
    let d = 0x10325476;

    const x = ((s: string) => {
        const n = s.length;
        const b = new Uint32Array(((n + 8) >> 6) + 1 << 4);
        for (let i = 0; i < n; i++) b[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
        b[n >> 2] |= 0x80 << ((n % 4) << 3);
        b[b.length - 2] = n << 3;
        return b;
    })(unescape(encodeURIComponent(s)));

    for (let i = 0; i < x.length; i += 16) {
        const olda = a, oldb = b, oldc = c, oldd = d;

        for (let j = 0; j < 64; j++) {
            let f, g;
            if (j < 16) { f = (b & c) | (~b & d); g = j; }
            else if (j < 32) { f = (d & b) | (~d & c); g = (5 * j + 1) % 16; }
            else if (j < 48) { f = b ^ c ^ d; g = (3 * j + 5) % 16; }
            else { f = c ^ (b | ~d); g = (7 * j) % 16; }

            const t = d;
            d = c;
            c = b;
            b = (b + (function(n, s) { return (n << s) | (n >>> (32 - s)); })((a + f + k[j] + x[i + g]) | 0, 
                j < 16 ? [7, 12, 17, 22][j % 4] :
                j < 32 ? [5, 9, 14, 20][j % 4] :
                j < 48 ? [4, 11, 16, 23][j % 4] :
                [6, 10, 15, 21][j % 4])) | 0;
            a = t;
        }

        a = (a + olda) | 0;
        b = (b + oldb) | 0;
        c = (c + oldc) | 0;
        d = (d + oldd) | 0;
    }

    const hex = (n: number) => {
        let s = "", v;
        for (let j = 0; j < 4; j++) {
            v = (n >> (j * 8)) & 0xff;
            s += ("00" + v.toString(16)).slice(-2);
        }
        return s;
    };
    return hex(a) + hex(b) + hex(c) + hex(d);
}

/**
 * Gravatar Profile Image Resolution
 * Generates a secure Gravatar URL from an email address with identicon fallback.
 */
export function getGravatarUrl(email: string | null | undefined, size: number = 200): string {
    if (!email) return '';
    const cleanEmail = email.trim().toLowerCase();
    const hash = md5(cleanEmail);
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon&r=g`;
}

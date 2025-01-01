class Color {
    constructor(r, g, b, a = 255) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    clone() {
        return new Color(this.r, this.g, this.b, this.a);
    }

    toString() {
        return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
    }

    toHex() {
        return `#${this.r.toString(16)}${this.g.toString(16)}${this.b.toString(16)}`;
    }

    // Range: h [0, 360], s [0, 1], v [0, 1]
    toHSV() {
        const r = this.r / 255;
        const g = this.g / 255;
        const b = this.b / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        let h = 0;
        if (delta === 0) {
            h = 0;
        } else if (max === r) {
            h = ((g - b) / delta) % 6;
        } else if (max === g) {
            h = ((b - r) / delta) + 2;
        } else {
            h = ((r - g) / delta) + 4;
        }

        h = Math.round(h * 60);
        if (h < 0) {
            h += 360;
        }

        const s = max === 0 ? 0 : delta / max;
        const v = max;

        return { h, s, v };
    }

    static fromHSV(h, s, v) {
        h = ((h % 360) + 360) % 360;
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;

        let r = 0;
        let g = 0;
        let b = 0;

        if (h < 60) {
            r = c;
            g = x;
        } else if (h < 120) {
            r = x;
            g = c;
        } else if (h < 180) {
            g = c;
            b = x;
        } else if (h < 240) {
            g = x;
            b = c;
        } else if (h < 300) {
            r = x;
            b = c;
        } else {
            r = c;
            b = x;
        }

        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);

        return new Color(r, g, b);
    }

    interpolate(other, t) {
        const r = this.r + (other.r - this.r) * t;
        const g = this.g + (other.g - this.g) * t;
        const b = this.b + (other.b - this.b) * t;
        const a = this.a + (other.a - this.a) * t;
        return new Color(r, g, b, a);
    }

}

class Vector2d {

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    clone() {
        return new Vector2d(this.x, this.y);
    }

    add(v) {
        return new Vector2d(this.x + v.x, this.y + v.y);
    }

    sub(v) {
        return new Vector2d(this.x - v.x, this.y - v.y);
    }

    mul(s) {
        return new Vector2d(this.x * s, this.y * s);
    }

    div(s) {
        return new Vector2d(this.x / s, this.y / s);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    cross(v) {
        return this.x * v.y - this.y * v.x;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalized() {
        const len = this.length();
        if (len === 0) {
            return new Vector2d(0, 0);
        }
        return new Vector2d(this.x / len, this.y / len);
    }

    normalize() {
        const len = this.length();
        this.x /= len;
        this.y /= len;
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2d(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    lerp(other, t) {
        return new Vector2d(this.x + (other.x - this.x) * t, this.y + (other.y - this.y) * t);
    }

}

export { Color, Vector2d };
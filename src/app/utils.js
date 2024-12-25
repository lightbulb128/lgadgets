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

}

export { Color };
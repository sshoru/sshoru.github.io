(function () {
    const canvas = document.getElementById('proc-stitch');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W = 0, H = 0;
    let animId = 0;

    // Supersample factor on top of devicePixelRatio so the raster stays crisp
    // under moderate browser zoom. (A canvas is a bitmap — zoom past this and
    // it will eventually pixelate; bump SS for more headroom at more cost.)
    const SS = 2;

    let current = null;     // { strokes, anim, durationMs }
    let progress = 0;       // 0..1 of the reveal animation
    let startTime = 0;

    function mulberry32(seed) {
        let s = seed >>> 0;
        return function () {
            s = (s + 0x6D2B79F5) | 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function getInk() {
        // Pure black on light bg, pure white on dark bg — maximum contrast.
        const theme = document.documentElement.getAttribute('data-theme');
        return theme === 'dark' ? '#ffffff' : '#000000';
    }

    // A "stroke" is one continuous polyline: { pts: [[x,y],...], alpha, lw }.
    // Drawn as a single path so its opacity applies once (no overlapping
    // round-cap beads where segments meet).

    // Design #1: seven phase-shifted sine curves.
    //   c = 0..6:  x(y) = cx + amp * sin(freq * 2π * (y/H) + basePhase + c*k)
    // Animated bottom-to-top.
    function buildSineDesign(rng) {
        const numCurves = 7;
        const freq      = 1.5 + rng() * 2.5;
        const cx        = W * (0.4 + rng() * 0.2);
        const amp       = W * (0.18 + rng() * 0.12);
        const basePhase = rng() * Math.PI * 2;
        const k         = 0.20 + rng() * 0.35; // phase step between curves

        const M = 600; // points per curve
        const alpha = 0.7 + rng() * 0.1;
        const lw = 1.0;

        const strokes = [];
        for (let c = 0; c < numCurves; c++) {
            const phase = basePhase + c * k;
            const pts = [];
            for (let i = 0; i <= M; i++) {
                const u = i / M;
                const y = u * H;
                const x = cx + amp * Math.sin(freq * 2 * Math.PI * u + phase);
                pts.push([x, y]);
            }
            strokes.push({ pts, alpha, lw });
        }
        return { strokes, anim: 'bottomUp', durationMs: 3500 };
    }

    // Design #2: classic curve-stitch envelope at the right edge.
    // Top edge has 10 points (i = 1..10), bottom edge 10 (i = 1..10), right
    // edge 20 (j = 1..20). top[i] ↔ right[j] when i = j; bottom[i] ↔ right[j]
    // when i + j = 21. Drawn slowly, top to bottom along the right edge.
    function buildEnvelopeDesign(rng) {
        // Inset the numbering so the first/last points sit a little away from
        // the corners (corner stitches would read as axis-parallel lines).
        const insetX = W * 0.08;
        const insetY = H * 0.04;
        const x0 = insetX, x1 = W - insetX;
        const y0 = insetY, y1 = H - insetY;

        const top = [], bot = [];
        for (let i = 1; i <= 10; i++) {
            const x = x0 + (i - 1) / 9 * (x1 - x0);
            top.push([x, 0]);
            bot.push([x, H]);
        }
        const right = [];
        for (let j = 1; j <= 20; j++) {
            right.push([W, y0 + (j - 1) / 19 * (y1 - y0)]);
        }

        const alpha = 0.7 + rng() * 0.1;
        const lw = 0.9;

        // j-ascending so the reveal walks down the right edge.
        const strokes = [];
        for (let j = 1; j <= 20; j++) {
            if (j <= 10) {
                const i = j;
                strokes.push({ pts: [top[i - 1], right[j - 1]], alpha, lw });
            } else {
                const i = 21 - j;
                strokes.push({ pts: [bot[i - 1], right[j - 1]], alpha, lw });
            }
        }
        return { strokes, anim: 'sequential', durationMs: 1500 };
    }

    const designs = [buildSineDesign, buildEnvelopeDesign];

    function buildDesign(rng) {
        const idx = Math.floor(rng() * designs.length);
        return designs[idx](rng);
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, W, H);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    // Draw a contiguous slice [from, to] of a stroke's points as one path.
    function strokePath(pts, from, to, alpha, lw, ink) {
        if (to - from < 1) return;
        ctx.strokeStyle = ink;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(pts[from][0], pts[from][1]);
        for (let i = from + 1; i <= to; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
    }

    // Render the design at a given reveal progress (0..1).
    function render(p) {
        clearCanvas();
        if (!current) return;
        const ink = getInk();
        const { strokes, anim } = current;

        if (anim === 'bottomUp') {
            // A horizontal front rises from the bottom (y=H) to the top (y=0).
            // For each curve, draw the portion below the front as one path.
            const frontY = H * (1 - p);
            for (const s of strokes) {
                const pts = s.pts;
                // pts are ordered top→bottom (y increasing); the visible part
                // is the suffix with y >= frontY.
                let k = 0;
                while (k < pts.length && pts[k][1] < frontY) k++;
                strokePath(pts, k, pts.length - 1, s.alpha, s.lw, ink);
            }
        } else { // sequential
            const total = strokes.length;
            const shown = Math.min(total, Math.floor(p * total + 1e-9));
            for (let i = 0; i < shown; i++) {
                const s = strokes[i];
                strokePath(s.pts, 0, s.pts.length - 1, s.alpha, s.lw, ink);
            }
        }
        ctx.globalAlpha = 1;
    }

    function frame(now) {
        const elapsed = now - startTime;
        progress = Math.min(1, elapsed / current.durationMs);
        render(progress);
        if (progress < 1) {
            animId = requestAnimationFrame(frame);
        } else {
            animId = 0;
        }
    }

    function resize() {
        const dpr = (window.devicePixelRatio || 1) * SS;
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        W = Math.floor(rect.width);
        H = Math.floor(rect.height);
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        canvas.width = Math.floor(W * dpr);
        canvas.height = Math.floor(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return true;
    }

    function start() {
        if (!resize()) { setTimeout(start, 500); return; }
        if (animId) cancelAnimationFrame(animId);
        const seed = (Math.random() * 0x7fffffff) >>> 0;
        const rng = mulberry32(seed);
        current = buildDesign(rng);
        console.log('[stitch] seed', seed, 'anim', current.anim,
                    'strokes', current.strokes.length, 'canvas', W + 'x' + H);
        progress = 0;
        startTime = performance.now();
        clearCanvas();
        animId = requestAnimationFrame(frame);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    let resizeRaf = 0;
    window.addEventListener('resize', () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => { if (resize()) start(); });
    });

    // Theme change: just recolor the current frame, don't restart the anim.
    const observer = new MutationObserver(() => render(progress));
    observer.observe(document.documentElement, {
        attributes: true, attributeFilter: ['data-theme'],
    });
})();

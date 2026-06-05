(function () {
    const canvas = document.getElementById('proc-gol');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const CELL = 16;          // pixel size of one cell
    const STEP_MS = 200;      // generations per second ≈ 1000/STEP_MS
    let cols = 0, rows = 0;
    let grid, nextGrid;

    function makeGrid(w, h) {
        const g = new Array(h);
        for (let y = 0; y < h; y++) g[y] = new Uint8Array(w);
        return g;
    }

    function seedRandom() {
        // Pick a fresh random density each time, between 0.06 and 0.16.
        const density = 0.06 + Math.random() * 0.10;
        for (let y = 0; y < rows; y++) {
            const row = grid[y];
            for (let x = 0; x < cols; x++) {
                row[x] = Math.random() < density ? 1 : 0;
            }
        }
    }

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        // Snap canvas display size to an exact multiple of CELL so the grid
        // fits without partial squares at the edges.
        cols = Math.max(1, Math.floor(rect.width  / CELL));
        rows = Math.max(1, Math.floor(rect.height / CELL));
        const cssW = cols * CELL;
        const cssH = rows * CELL;
        canvas.style.width  = cssW + 'px';
        canvas.style.height = cssH + 'px';
        canvas.width  = Math.floor(cssW * dpr);
        canvas.height = Math.floor(cssH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        grid = makeGrid(cols, rows);
        nextGrid = makeGrid(cols, rows);
        seedRandom();
        return true;
    }

    function step() {
        for (let y = 0; y < rows; y++) {
            const yp = (y - 1 + rows) % rows;
            const yn = (y + 1) % rows;
            const row  = grid[y];
            const rowU = grid[yp];
            const rowD = grid[yn];
            const out  = nextGrid[y];
            for (let x = 0; x < cols; x++) {
                const xp = (x - 1 + cols) % cols;
                const xn = (x + 1) % cols;
                const n =
                    rowU[xp] + rowU[x] + rowU[xn] +
                    row[xp]            + row[xn] +
                    rowD[xp] + rowD[x] + rowD[xn];
                const alive = row[x];
                out[x] = (alive ? (n === 2 || n === 3) : (n === 3)) ? 1 : 0;
            }
        }
        const tmp = grid; grid = nextGrid; nextGrid = tmp;
    }

    function draw() {
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        const fill = (getComputedStyle(document.documentElement)
            .getPropertyValue('--text') || '#1a1a1a').trim();
        ctx.fillStyle = fill;
        ctx.globalAlpha = 0.55;
        for (let y = 0; y < rows; y++) {
            const row = grid[y];
            const py = y * CELL;
            for (let x = 0; x < cols; x++) {
                if (row[x]) ctx.fillRect(x * CELL + 1, py + 1, CELL - 2, CELL - 2);
            }
        }
        ctx.globalAlpha = 1;
    }

    function loop() {
        step();
        draw();
        setTimeout(() => requestAnimationFrame(loop), STEP_MS);
    }

    function start() {
        if (!resize()) {
            // Canvas hidden (e.g. mobile) — try again after layout settles.
            setTimeout(start, 500);
            return;
        }
        draw();
        requestAnimationFrame(loop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    let resizeRaf = 0;
    window.addEventListener('resize', () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => { resize(); draw(); });
    });
})();

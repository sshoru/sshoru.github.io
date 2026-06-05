(function () {
    const STORAGE_KEY = 'theme';
    const root = document.documentElement;

    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-toggle .label').forEach(el => {
            el.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
        });
        document.querySelectorAll('.theme-toggle .icon').forEach(el => {
            el.textContent = theme === 'dark' ? '☀' : '☾';
        });
    }

    function preferredTheme() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    applyTheme(preferredTheme());

    document.addEventListener('DOMContentLoaded', () => {
        applyTheme(preferredTheme());

        document.querySelectorAll('.theme-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                localStorage.setItem(STORAGE_KEY, next);
                applyTheme(next);
            });
        });

        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.querySelector('.backdrop');
        const openBtn = document.querySelector('.nav-toggle');

        function close() {
            sidebar && sidebar.classList.remove('open');
            backdrop && backdrop.classList.remove('show');
        }
        function open() {
            sidebar && sidebar.classList.add('open');
            backdrop && backdrop.classList.add('show');
        }

        openBtn && openBtn.addEventListener('click', open);
        backdrop && backdrop.addEventListener('click', close);

        document.querySelectorAll('.game-fit').forEach(wrap => {
            const iframe = wrap.querySelector('iframe');
            if (!iframe) return;
            const nw = parseFloat(iframe.dataset.nativeWidth);
            const nh = parseFloat(iframe.dataset.nativeHeight);
            if (!nw || !nh) return;
            iframe.style.width = nw + 'px';
            iframe.style.height = nh + 'px';
            iframe.style.transformOrigin = '0 0';
            wrap.style.aspectRatio = `${nw} / ${nh}`;
            const fit = () => {
                const scale = wrap.clientWidth / nw;
                iframe.style.transform = `scale(${scale})`;
            };
            fit();
            window.addEventListener('resize', fit);
        });
    });
})();

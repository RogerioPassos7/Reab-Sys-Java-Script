/* Elementos compartilhados. Dados do usuário são inseridos com textContent. */
(function () {
    'use strict';
    const paths = {
        home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
        users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m2 10v-3a6 6 0 0 0-2-4"/>',
        calendar:
            '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-12 5h2m4 0h2"/>',
        check: '<path d="m5 12 4 4L19 6"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    };
    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }
    function icon(name) {
        const span = element('span', 'app-icon');
        span.setAttribute('aria-hidden', 'true');
        span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.home}</svg>`;
        return span;
    }
    function setupNavigation() {
        const aside = document.querySelector('[data-navigation]');
        if (!aside) return;
        const brand = element('a', 'app-brand');
        brand.href = '../index.html';
        const image = element('img');
        image.src = '../assets/images/logo/ReabSYS_completa.png';
        image.alt = 'ReabSYS — página inicial';
        brand.append(image);
        const toggle = element('button', 'app-menu-toggle', 'Menu');
        toggle.type = 'button';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', 'app-navigation');
        const nav = element('nav', 'app-nav');
        nav.id = 'app-navigation';
        nav.setAttribute('aria-label', 'Navegação principal');
        const routes = [
            ['dashboard', 'fisiomenu.html', 'home', 'Visão geral'],
            ['patients', 'pacientes.html', 'users', 'Pacientes'],
            ['agenda', 'agenda.html', 'calendar', 'Agenda'],
        ];
        for (const [page, href, glyph, label] of routes) {
            const link = element('a', 'app-nav-link');
            link.href = href;
            link.append(icon(glyph), element('span', '', label));
            if (document.body.dataset.page === page)
                link.setAttribute('aria-current', 'page');
            nav.append(link);
        }
        const note = element('div', 'sidebar-note', 'Um cuidado mais próximo.');
        const back = element('a', 'app-back', '← Voltar ao site');
        back.href = '../index.html';
        toggle.addEventListener('click', () => {
            const expanded = toggle.getAttribute('aria-expanded') !== 'true';
            toggle.setAttribute('aria-expanded', String(expanded));
            aside.classList.toggle('is-open', expanded);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && aside.classList.contains('is-open')) {
                aside.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.focus();
            }
        });
        aside.append(brand, toggle, nav, note, back);
    }
    let toastTimer;
    function notify(message) {
        const region = document.getElementById('app-toast');
        clearTimeout(toastTimer);
        region.textContent = message;
        region.hidden = false;
        toastTimer = setTimeout(() => {
            region.hidden = true;
        }, 6000);
    }
    function error(message) {
        const region = document.getElementById('app-error');
        region.textContent = message;
        region.hidden = false;
    }
    function clearError() {
        document.getElementById('app-error').hidden = true;
    }
    function dateLabel(value, options = { day: '2-digit', month: 'short' }) {
        return new Intl.DateTimeFormat('pt-BR', options).format(
            new Date(`${value}T12:00:00`),
        );
    }
    function badge(status) {
        const labels = {
            ativo: 'Ativo',
            inativo: 'Inativo',
            agendada: 'Agendada',
            concluida: 'Concluída',
            cancelada: 'Cancelada',
        };
        return element('span', `badge badge-${status}`, labels[status]);
    }
    function empty(container, title, description) {
        const box = element('div', 'empty-state');
        box.append(element('strong', '', title), element('p', '', description));
        container.append(box);
    }
    function action(label, className, handler) {
        const button = element('button', className, label);
        button.type = 'button';
        button.addEventListener('click', handler);
        return button;
    }
    function watch(render) {
        const refresh = () => {
            try {
                render();
                clearError();
            } catch (exception) {
                error(exception.message);
            }
        };
        window.addEventListener('storage', (event) => {
            if (event.key === ReabStore.STORAGE_KEY || event.key === null)
                refresh();
        });
        window.addEventListener('reabsys:change', refresh);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) refresh();
        });
        return refresh;
    }
    setupNavigation();
    window.ReabUI = Object.freeze({
        element,
        icon,
        notify,
        error,
        clearError,
        dateLabel,
        badge,
        empty,
        action,
        watch,
    });
})();

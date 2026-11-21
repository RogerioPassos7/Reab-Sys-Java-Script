/* Elementos compartilhados. Dados do usuário são inseridos com textContent. */
(function () {
    'use strict';
    const paths = {
        home: "<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\" />\n  <path d=\"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\" />",
        users: "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\" />\n  <path d=\"M16 3.128a4 4 0 0 1 0 7.744\" />\n  <path d=\"M22 21v-2a4 4 0 0 0-3-3.87\" />\n  <circle cx=\"9\" cy=\"7\" r=\"4\" />",
        calendar: "<path d=\"M8 2v3\" />\n  <path d=\"M16 2v3\" />\n  <rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" />\n  <path d=\"M3 9h18\" />\n  <path d=\"M8 13h.01\" />\n  <path d=\"M12 13h.01\" />\n  <path d=\"M16 13h.01\" />\n  <path d=\"M8 17h.01\" />\n  <path d=\"M12 17h.01\" />\n  <path d=\"M16 17h.01\" />",
        plans: "<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\" />\n  <path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\" />\n  <path d=\"M12 11h4\" />\n  <path d=\"M12 16h4\" />\n  <path d=\"M8 11h.01\" />\n  <path d=\"M8 16h.01\" />",
        exercises: "<path d=\"M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z\" />\n  <path d=\"m2.5 21.5 1.4-1.4\" />\n  <path d=\"m20.1 3.9 1.4-1.4\" />\n  <path d=\"M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z\" />\n  <path d=\"m9.6 14.4 4.8-4.8\" />",
        evolution: "<path d=\"M12 16v5\" />\n  <path d=\"M16 14.639V21\" />\n  <path d=\"M20 10.656V21\" />\n  <path d=\"m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15\" />\n  <path d=\"M4 18.463V21\" />\n  <path d=\"M8 14.656V21\" />",
        profile: "<path d=\"M17.925 20.056a6 6 0 0 0-11.851.001\" />\n  <circle cx=\"12\" cy=\"11\" r=\"4\" />\n  <circle cx=\"12\" cy=\"12\" r=\"10\" />",
        menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
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
        span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.home}</svg>`;
        return span;
    }
    function setupNavigation() {
        const aside = document.querySelector('[data-navigation]');
        if (!aside) return;
        const brand = element('a', 'app-brand');
        const patientArea = document.body.dataset.role === 'patient';
        brand.href = patientArea ? 'paciente-exercicios.html' : 'fisiomenu.html';
        const image = element('img');
        image.src = '../assets/images/logo/ReabSYS_iconeBranco.png';
        image.alt = 'ReabSYS — início';
        brand.append(image);
        const toggle = element('button', 'app-menu-toggle');
        toggle.append(icon('menu'), element('span', '', 'Menu'));
        toggle.type = 'button';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', 'app-nav-shell');
        const nav = element('nav', 'app-nav');
        nav.id = 'app-navigation';
        nav.setAttribute('aria-label', 'Navegação principal');
        const routes = patientArea ? [
            ['patient-exercises', 'paciente-exercicios.html', 'exercises', 'Meus exercícios'],
            ['patient-record', 'paciente-registro.html', 'plans', 'Enviar registro'],
            ['patient-agenda', 'paciente-agenda.html', 'calendar', 'Agenda'],
            ['patient-evolution', 'paciente-evolucao.html', 'evolution', 'Minha evolução'],
        ] : [
            ['dashboard', 'fisiomenu.html', 'home', 'Início'],
            ['patients', 'pacientes.html', 'users', 'Pacientes'],
            ['agenda', 'agenda.html', 'calendar', 'Agenda'],
            ['plans', 'planos.html', 'plans', 'Planos'],
            ['exercises', 'exercicios.html', 'exercises', 'Exercícios'],
            ['evolution', 'evolucao.html', 'evolution', 'Evolução'],
        ];
        for (const [page, href, glyph, label] of routes) {
            const link = element('a', 'app-nav-link');
            link.href = href;
            link.append(icon(glyph), element('span', '', label));
            if (location.pathname.split('/').pop() === href)
                link.setAttribute('aria-current', 'page');
            nav.append(link);
        }
        const profile = element('a', 'app-nav-link app-profile');
        profile.href = patientArea ? 'paciente-perfil.html' : 'perfil.html';
        profile.append(icon('profile'), element('span', '', 'Perfil'));
        if (location.pathname.split('/').pop() === profile.getAttribute('href')) profile.setAttribute('aria-current', 'page');
        const shell = element('div', 'app-nav-shell');
        shell.id = 'app-nav-shell';
        shell.append(nav, profile);
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
        aside.append(brand, toggle, shell);
    }
    function exerciseMedia(exercise) {
        const box = element('div', 'exercise-media');
        function placeholder() { box.replaceChildren(element('p', 'exercise-placeholder', 'Foto indisponível para este exercício')); }
        if (!exercise.image) { placeholder(); return box; }
        const image = element('img', 'exercise-card-image');
        image.src = exercise.image;
        image.alt = exercise.name;
        image.loading = 'lazy';
        image.addEventListener('error', placeholder, { once: true });
        box.append(image);
        return box;
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
        exerciseMedia,
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

(function () {
    'use strict';
    const UI = ReabUI;
    const form = document.getElementById('exercise-form');
    const imageUrl = document.getElementById('exercise-image-url');
    const imageFile = document.getElementById('exercise-image-file');
    const preview = document.getElementById('exercise-preview');
    const formError = document.getElementById('exercise-form-error');
    const patientSelect = document.getElementById('assignment-patient');
    const search = document.getElementById('exercise-search');
    const list = document.getElementById('exercise-list');
    const editor = document.getElementById('exercise-editor');
    const addButton = document.getElementById('add-exercise');
    const saveButton = document.getElementById('save-exercise');
    let draftImage = '';
    let imageVersion = 0;
    let selected = new Set();
    let loadedPatient = null;
    let savedSelection = '';

    function normalize(value) {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    function showPreview(source) {
        preview.hidden = !source;
        if (source) preview.src = source;
        else preview.removeAttribute('src');
    }

    function resetForm() {
        imageVersion++;
        form.reset();
        form.elements.id.value = '';
        draftImage = '';
        showPreview('');
        saveButton.disabled = false;
        saveButton.textContent = 'Criar exercício';
        document.getElementById('exercise-form-title').textContent =
            'Novo exercício';
        editor.hidden = true;
        addButton.setAttribute('aria-expanded', 'false');
        formError.hidden = true;
    }

    function edit(exercise) {
        resetForm();
        form.elements.id.value = exercise.id;
        form.elements.name.value = exercise.name;
        form.elements.benefit.value = exercise.benefit;
        if (/^https?:/.test(exercise.image)) imageUrl.value = exercise.image;
        else draftImage = exercise.image;
        showPreview(exercise.image);
        saveButton.textContent = 'Salvar alterações';
        document.getElementById('exercise-form-title').textContent =
            'Editar exercício';
        editor.hidden = false;
        addButton.setAttribute('aria-expanded', 'true');
        form.elements.name.focus();
    }

    function selectionStatus() {
        document.getElementById('assignment-status').textContent =
            patientSelect.value
                ? `${selected.size} exercícios selecionados. Salve para atualizar o plano do paciente.`
                : 'Selecione um paciente para marcar os exercícios nos cards.';
        document.getElementById('save-assignment').disabled =
            !patientSelect.value;
    }

    function renderCards(state) {
        const query = normalize(search.value.trim());
        const exercises = state.exercises.filter((item) =>
            normalize(`${item.name} ${item.benefit}`).includes(query),
        );
        list.replaceChildren();
        document.getElementById('exercise-count').textContent =
            `${exercises.length} de ${state.exercises.length}`;
        if (!exercises.length)
            UI.empty(
                list,
                'Nenhum exercício encontrado',
                'Ajuste a pesquisa ou crie um exercício.',
            );
        for (const exercise of exercises) {
            const card = UI.element('article', 'exercise-card');
            const image = UI.exerciseMedia(exercise);
            const content = UI.element('div', 'exercise-card-content');
            content.append(
                UI.element('h3', '', exercise.name),
                UI.element('p', 'patient-details', exercise.benefit),
            );
            const label = UI.element('label', 'exercise-selection');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = exercise.id;
            checkbox.checked = selected.has(exercise.id);
            checkbox.disabled = !patientSelect.value;
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) selected.add(exercise.id);
                else selected.delete(exercise.id);
                selectionStatus();
            });
            label.append(
                checkbox,
                UI.element('span', '', 'Atribuir ao paciente'),
            );
            const actions = UI.element('div', 'card-actions');
            const editButton = UI.action(
                'Editar',
                'button button-secondary button-small',
                () => edit(exercise),
            );
            editButton.setAttribute('aria-label', `Editar ${exercise.name}`);
            const remove = UI.action(
                'Remover',
                'button button-danger button-small',
                () => {
                    if (
                        !window.confirm(
                            `Remover “${exercise.name}”? O exercício será retirado dos planos e seus registros de dor também serão excluídos.`,
                        )
                    )
                        return;
                    try {
                        ReabStore.deleteExercise(exercise.id);
                        if (form.elements.id.value === exercise.id) resetForm();
                        UI.notify('Exercício removido.');
                    } catch (error) {
                        UI.error(error.message);
                    }
                },
            );
            remove.setAttribute('aria-label', `Remover ${exercise.name}`);
            if (!exercise.builtin) actions.append(editButton, remove);
            content.append(label, actions);
            card.append(image, content);
            list.append(card);
        }
        selectionStatus();
    }

    const refresh = UI.watch(() => {
        const state = ReabStore.read();
        const patientId = patientSelect.value;
        patientSelect.replaceChildren(new Option('Selecione um paciente', ''));
        for (const patient of state.patients)
            patientSelect.add(new Option(patient.name, patient.id));
        patientSelect.value = patientId;
        const assigned =
            state.assignments.find(
                (item) => item.patientId === patientSelect.value,
            )?.exerciseIds || [];
        const fingerprint = JSON.stringify(assigned);
        if (
            loadedPatient !== patientSelect.value ||
            fingerprint !== savedSelection
        ) {
            selected = new Set(assigned);
            loadedPatient = patientSelect.value;
            savedSelection = fingerprint;
        }
        selected = new Set(
            [...selected].filter((id) =>
                state.exercises.some((item) => item.id === id),
            ),
        );
        renderCards(state);
    });

    addButton.addEventListener('click', () => {
        resetForm();
        editor.hidden = false;
        addButton.setAttribute('aria-expanded', 'true');
        form.elements.name.focus();
    });

    imageUrl.addEventListener('input', () => {
        imageVersion++;
        draftImage = '';
        imageFile.value = '';
        saveButton.disabled = false;
        showPreview(
            /^https?:\/\//i.test(imageUrl.value.trim())
                ? imageUrl.value.trim()
                : '',
        );
    });

    imageFile.addEventListener('change', async () => {
        const file = imageFile.files[0];
        const version = ++imageVersion;
        if (!file) return;
        formError.hidden = true;
        saveButton.disabled = true;
        try {
            if (
                ![
                    'image/png',
                    'image/jpeg',
                    'image/webp',
                    'image/gif',
                ].includes(file.type) ||
                file.size > 5 * 1024 * 1024
            )
                throw new Error(
                    'Escolha uma imagem PNG, JPG, WebP ou GIF de até 5 MB.',
                );
            const bitmap = await createImageBitmap(file);
            const scale = Math.min(1, 960 / bitmap.width, 720 / bitmap.height);
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(bitmap.width * scale));
            canvas.height = Math.max(1, Math.round(bitmap.height * scale));
            const context = canvas.getContext('2d');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            bitmap.close();
            if (version !== imageVersion) return;
            draftImage = canvas.toDataURL('image/jpeg', 0.8);
            imageUrl.value = '';
            showPreview(draftImage);
        } catch (error) {
            if (version !== imageVersion) return;
            imageFile.value = '';
            formError.textContent =
                error.message || 'Não foi possível abrir a imagem.';
            formError.hidden = false;
        } finally {
            if (version === imageVersion) saveButton.disabled = false;
        }
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!form.reportValidity() || saveButton.disabled) return;
        try {
            ReabStore.saveExercise({
                id: form.elements.id.value,
                name: form.elements.name.value,
                benefit: form.elements.benefit.value,
                image: draftImage || imageUrl.value,
            });
            resetForm();
            UI.notify('Exercício salvo.');
        } catch (error) {
            formError.textContent = error.message;
            formError.hidden = false;
        }
    });
    document
        .getElementById('cancel-exercise-edit')
        .addEventListener('click', resetForm);
    document
        .getElementById('assignment-form')
        .addEventListener('submit', (event) => {
            event.preventDefault();
            try {
                ReabStore.assignExercises(patientSelect.value, [...selected]);
                UI.notify('Exercícios do paciente atualizados.');
            } catch (error) {
                UI.error(error.message);
            }
        });
    patientSelect.addEventListener('change', refresh);
    search.addEventListener('input', refresh);
    refresh();
    const requestedPatient = new URLSearchParams(location.search).get(
        'patient',
    );
    if (requestedPatient) {
        patientSelect.value = requestedPatient;
        refresh();
    }
})();

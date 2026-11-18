const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const source = readFileSync(join(__dirname, '../frontend/js/store.js'), 'utf8');

function setup(values = new Map(), failWrite = false) {
    const context = {
        localStorage: {
            getItem: (key) => values.get(key) ?? null,
            setItem: (key, value) => {
                if (failWrite) throw new Error('quota');
                values.set(key, value);
            },
        },
        window: { dispatchEvent() {} },
        Event: class {},
        crypto: { randomUUID },
    };
    vm.runInNewContext(source, context);
    return { store: context.window.ReabStore, values };
}
function future(store) {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return store.today(date);
}
function patient(store, overrides = {}) {
    return store.savePatient({
        name: 'Ana Teste',
        email: 'ana@example.com',
        phone: '',
        condition: 'Reabilitação',
        status: 'ativo',
        ...overrides,
    });
}
function session(store, patientId, overrides = {}) {
    return store.addSession({
        patientId,
        date: future(store),
        time: '14:00',
        duration: 50,
        type: 'Fisioterapia',
        ...overrides,
    });
}

test('cadastro é persistido e continua disponível após reinicializar o código', () => {
    const { store, values } = setup();
    const saved = patient(store);
    const reloaded = setup(values).store;
    assert.equal(
        reloaded.read().patients.find((item) => item.id === saved.id).name,
        'Ana Teste',
    );
});
test('valida nome, telefone, e-mail e impede duplicidade de e-mail sem diferenciar maiúsculas', () => {
    const { store } = setup();
    patient(store);
    assert.throws(() => patient(store, { email: 'ANA@EXAMPLE.COM' }), /e-mail/);
    assert.throws(
        () => patient(store, { name: '   ', email: 'outra@example.com' }),
        /nome/,
    );
    assert.throws(
        () => patient(store, { phone: '123', email: 'outra@example.com' }),
        /telefone/,
    );
    assert.throws(() => patient(store, { email: 'invalido' }), /e-mail/);
});
test('edição mantém o identificador e não cria um segundo paciente', () => {
    const { store } = setup();
    const saved = patient(store);
    const before = store.read().patients.length;
    store.savePatient({ ...saved, name: 'Ana Atualizada', status: 'inativo' });
    assert.equal(store.read().patients.length, before);
    assert.equal(
        store.read().patients.find((item) => item.id === saved.id).status,
        'inativo',
    );
});
test('paciente inativo não pode receber novos agendamentos', () => {
    const { store } = setup();
    const saved = patient(store, { status: 'inativo' });
    assert.throws(() => session(store, saved.id), /ativo/);
});
test('bloqueia sobreposição entre pacientes e permite horários adjacentes', () => {
    const { store } = setup();
    const first = patient(store);
    const second = patient(store, {
        name: 'Outra Pessoa',
        email: 'outra@example.com',
    });
    session(store, first.id);
    assert.throws(
        () => session(store, second.id, { time: '14:30' }),
        /intervalo/,
    );
    assert.doesNotThrow(() => session(store, second.id, { time: '14:50' }));
});
test('cancelamento libera o intervalo e permanece no histórico', () => {
    const { store } = setup();
    const saved = patient(store);
    const booked = session(store, saved.id);
    store.changeSessionStatus(booked.id, 'cancelada');
    assert.doesNotThrow(() => session(store, saved.id));
    assert.equal(
        store.read().sessions.find((item) => item.id === booked.id).status,
        'cancelada',
    );
    assert.throws(
        () => store.changeSessionStatus(booked.id, 'concluida'),
        /alterada/,
    );
});
test('valida datas inexistentes, agendamentos passados e duração', () => {
    const { store } = setup();
    const saved = patient(store);
    assert.equal(store.isDate('2026-02-30'), false);
    assert.throws(
        () => session(store, saved.id, { date: '2026-02-30' }),
        /data/,
    );
    assert.throws(
        () => session(store, saved.id, { date: '2020-01-01' }),
        /futuros/,
    );
    assert.throws(() => session(store, saved.id, { duration: 17 }), /duração/);
});
test('excluir paciente remove sessões vinculadas, preservando os demais registros', () => {
    const { store } = setup();
    const saved = patient(store);
    session(store, saved.id);
    const others = store.read().sessions.length - 1;
    store.deletePatient(saved.id);
    assert.equal(
        store.read().patients.some((item) => item.id === saved.id),
        false,
    );
    assert.equal(store.read().sessions.length, others);
    assert.equal(
        store.read().sessions.some((item) => item.patientId === saved.id),
        false,
    );
});
test('lista vazia salva não é repopulada com dados de exemplo', () => {
    const { store, values } = setup();
    for (const saved of store.read().patients) store.deletePatient(saved.id);
    assert.equal(setup(values).store.read().patients.length, 0);
    assert.equal(setup(values).store.read().sessions.length, 0);
});
test('dados corrompidos geram erro e são preservados para recuperação', () => {
    const { store, values } = setup();
    values.set(store.STORAGE_KEY, '{broken');
    assert.throws(() => store.read(), /corrompidos/);
    assert.equal(values.get(store.STORAGE_KEY), '{broken');
});
test('falha de gravação não sinaliza sucesso nem altera os registros persistidos', () => {
    const { store, values } = setup();
    store.read();
    const before = values.get(store.STORAGE_KEY);
    assert.throws(() => patient(setup(values, true).store), /salvar/);
    assert.equal(values.get(store.STORAGE_KEY), before);
});

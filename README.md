# ReabSYS — demonstração Web em JavaScript

Versão acadêmica com três telas funcionais, desenvolvida com HTML, CSS e JavaScript puro.
Este é um repositório independente da implementação em [reabsys/reabsys](https://github.com/reabsys/reabsys).

## Funcionalidades

- **Visão geral:** indicadores calculados a partir dos registros, próximas sessões e calendário navegável.
- **Pacientes:** cadastro com validação, pesquisa, filtros, edição e exclusão com confirmação.
- **Agenda:** agendamento, bloqueio de sobreposição, filtros, conclusão e cancelamento.
- **Persistência:** dados fictícios no `localStorage`, compartilhados pelas telas e atualizados entre abas.
- **Responsividade:** navegação e formulários para computador e celular, com suporte a teclado.

## Abrir o site

Se o GitHub Pages estiver ativado, acesse o endereço de publicação mostrado na seção **Deployments** deste repositório.
A página inicial encaminha para `frontend/index.html`.

Para baixar tudo, use **Code → Download ZIP** e extraia a pasta inteira antes de executar.

## Executar no seu computador

**Windows com Python 3:** dê dois cliques em `INICIAR-WINDOWS.bat`.
O navegador abre automaticamente; mantenha o terminal aberto durante o uso.

**Linux/macOS:** execute na pasta extraída:

```sh
python3 iniciar.py
```

**VS Code:** abra a pasta inteira e use **Open with Live Server** em `frontend/index.html`.

Na página inicial, clique em **Começar agora** e depois **Entrar na demonstração**.
Não é necessário instalar npm, Angular, Java ou banco de dados.

## Organização

```text
frontend/
  assets/images/       Imagens e identidade visual
  css/app.css          Estilos compartilhados e responsividade das telas funcionais
  js/store.js          Regras e armazenamento local
  js/ui.js             Navegação e elementos compartilhados
  js/dashboard.js      Indicadores e calendário
  js/patients.js       Cadastro, pesquisa, edição e exclusão de pacientes
  js/agenda.js         Agendamento, filtros e ações das sessões
  pages/               Telas HTML
tests/store.test.cjs    Testes das regras com Node.js
iniciar.py             Servidor local e abertura do navegador
GUIA-ATIVIDADE.md       Roteiro de apresentação e regras da demonstração
LEIA-PRIMEIRO.txt       Instruções de execução e solução de problemas
```

## Testes

Com Node.js 18 ou superior:

```sh
node --test tests/store.test.cjs
```

## Limites da demonstração

Use somente dados fictícios. Esta versão não possui autenticação, backend ou proteção para dados clínicos reais.
Os registros pertencem ao navegador e à origem usados; não são sincronizados entre dispositivos.
Os exemplos são criados no primeiro acesso. Consulte o guia para reiniciar os dados.

A proposta e a identidade visual têm origem no Projeto Integrador ReabSYS.

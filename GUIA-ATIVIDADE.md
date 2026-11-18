# ReabSYS — atividade de JavaScript

Esta versão mantém HTML, CSS e JavaScript, sem Angular e sem etapa de build.
É uma demonstração acadêmica com dados fictícios. Não implementa autenticação nem backend.

## Executar localmente

Na raiz do projeto:

```sh
python -m http.server 8000 --directory frontend
```

Abra http://localhost:8000. No Windows, também é possível usar `py` no lugar de `python`.
Outra opção é abrir `frontend/index.html` pelo Live Server do VS Code.
Use um servidor local, em vez de abrir os arquivos com `file://`, para manter a mesma origem de armazenamento.

Clique em **Começar agora** ou **Entrar** e depois em **Entrar na demonstração**.
A entrada demonstrativa não solicita credenciais e não representa um login real.

## Três telas funcionais

| Tela | Caminho | Comportamentos |
| --- | --- | --- |
| Visão geral | `frontend/pages/fisiomenu.html` | Indicadores calculados a partir dos registros, próximas sessões, pacientes sem agendamento futuro e calendário navegável |
| Pacientes | `frontend/pages/pacientes.html` | Cadastro validado, pesquisa sem diferenciar acentos/maiúsculas, filtro de situação, edição e exclusão com confirmação |
| Agenda | `frontend/pages/agenda.html` | Agendamento, bloqueio de sobreposição, pesquisa por paciente, filtros de data/situação, conclusão e cancelamento com confirmação |

## Roteiro de apresentação

1. Abra a demonstração e confira o dashboard com os registros de exemplo.
2. Em Pacientes, tente cadastrar com os campos obrigatórios vazios. O navegador indica os campos pendentes.
3. Cadastre uma pessoa fictícia, com e-mail único e descrição de acompanhamento.
4. Pesquise o nome, edite a descrição e recarregue a página: a alteração permanece.
5. Clique em **Agendar** no cartão do paciente. A agenda abre com o paciente selecionado.
6. Escolha data e horário futuros, tipo e duração. Agende a sessão.
7. Tente criar outra sessão com horário sobreposto: o sistema deve apresentar uma mensagem e preservar a agenda.
8. Filtre por data e situação. Limpe os filtros para recuperar o histórico completo.
9. Cancele uma sessão e confirme. Ela permanece no histórico, mas libera o horário.
10. Marque outra sessão como concluída e confira os indicadores do dashboard.
11. Exclua um paciente de teste. A confirmação informa que suas sessões também serão removidas.
12. Em uma tela estreita, abra o botão **Menu** e navegue entre as três telas.

Os cadastros e a agenda são compartilhados pelas telas. Alterações em outra aba da mesma origem atualizam a interface.

## Regras e persistência

- O primeiro acesso cria quatro pacientes e três sessões de exemplo. Datas são relativas ao primeiro acesso.
- Os registros ficam na chave `reabsys.demo.v1` do `localStorage`, vinculados ao navegador, host e porta usados.
- Campos obrigatórios, e-mail, telefone opcional com DDD e duplicidade de e-mail são validados.
- Somente pacientes ativos podem receber novos agendamentos.
- Novas sessões precisam de data/horário futuros e duração de 15 a 120 minutos em intervalos de 5.
- Há apenas uma agenda de profissional nesta demonstração. Sessões não canceladas não podem se sobrepor.
- Sessões canceladas ficam no histórico; excluir um paciente remove também suas sessões, após confirmação.
- Concluir é uma ação manual na demonstração; não há integração com atendimentos reais.
- O dashboard calcula a conclusão como concluídas / (concluídas + agendadas). Não representa evolução clínica.
- As datas seguem o relógio e o fuso do dispositivo, sem conversão para UTC.
- Falhas de armazenamento geram mensagens. Conteúdo inválido não é sobrescrito automaticamente.
- Não existem sincronização entre dispositivos, contas ou proteção para dados de saúde. Use apenas dados fictícios.

Para reiniciar os exemplos, abra as ferramentas do navegador, vá a Aplicativo/Armazenamento local,
remova **somente** a chave `reabsys.demo.v1` e recarregue a página. Isso apaga os registros da demonstração.
Em caso de dados corrompidos, copie o conteúdo da chave antes de removê-la, se quiser preservá-lo.

## Organização do código

```text
frontend/
  css/app.css          Estilos compartilhados das três telas e responsividade
  js/store.js          Validação, regras e localStorage
  js/ui.js             Navegação, mensagens e elementos DOM compartilhados
  js/dashboard.js      Indicadores e calendário
  js/patients.js       Formulário, pesquisa, edição e exclusão
  js/agenda.js         Formulário, filtros e ações das sessões
  pages/fisiomenu.html Visão geral
  pages/pacientes.html Cadastro e listagem
  pages/agenda.html    Agendamento e histórico
tests/store.test.cjs   Testes das regras de negócio com Node.js
```

Dados digitados são inseridos com `textContent`, sem interpolação em HTML.
A navegação compartilhada usa ícones SVG locais, sem depender do script remoto Lucide.
As páginas públicas e seus estilos foram preservados; foram ajustados apenas os pontos de entrada da demonstração.
A fonte Poppins continua usando Google Fonts, com fonte alternativa quando indisponível.

## Verificações

Com Node.js 18 ou superior:

```sh
node --test tests/store.test.cjs
```

O roteiro acima permite verificar manualmente os requisitos da atividade, sem instalar dependências.

Na validação desta entrega, os 11 testes de regras passaram. Também passaram 46 verificações automatizadas
no Chromium, incluindo os fluxos de cadastro/edição/exclusão, agenda, filtros, persistência após recarga,
atualização entre abas, estados de erro e proteção contra interpretação de HTML digitado.
As três telas foram verificadas em larguras de 320, 390, 768, 1024 e 1440 pixels, sem rolagem horizontal.
Os links locais e os IDs das páginas foram conferidos. Não foram realizados testes em Firefox ou Safari.

Esta implementação não inclui migração para React/Angular, backend, banco remoto ou análise por IA.
Essas tecnologias citadas no README original continuam fazendo parte da proposta futura.

# 📅 Painel de Vencimentos

Painel web para escritórios de contabilidade acompanharem, em uma única tela, tudo que vence nos clientes: **certificado digital A1**, **certidões negativas** (CND Federal, Estadual, Municipal e CRF FGTS), **alvarás**, **procurações** e **licenças**.

O painel mostra o que vence em **7, 15 e 30 dias**, destaca o que já venceu e exibe a situação de cada cliente.

---

## ✨ Funcionalidades

### Acompanhamento
- **Resumo por prazo:** cards com a quantidade de documentos vencidos, até 7 dias, 8 a 15, 16 a 30 e em dia. Clicar em um card filtra a lista.
- **Faixa de situação geral:** fica vermelha quando há documentos vencidos ou vencendo na semana.
- **Aba Vencimentos:** tabela ordenada pelo vencimento mais próximo, com barra de prazo, status, responsável e ações.
- **Aba Por cliente:** um card por cliente, colorido pelo documento mais crítico.
- **Aba Clientes:** lista do cadastro, com regime, contato e quantidade de documentos.
- **Filtros:** busca por nome ou CNPJ/CPF (com ou sem pontuação), tipo de documento e período. A tecla `/` foca a busca.

### Cadastro
- **Clientes:** nome, CNPJ ou CPF (com máscara e validação dos dígitos), regime tributário, contato, e-mail e telefone.
- **Documentos:** cliente, tipo, número, emissão, vencimento, responsável e observações. O formulário mostra o status assim que a data é escolhida.
- **Editar e excluir** clientes e documentos. Ao excluir um cliente, os documentos dele também são removidos.
- **Cadastro rápido:** dá para criar um cliente sem sair do formulário de documento.

### Dados
- **Salvamento automático** no navegador (localStorage). O painel começa vazio e mantém o que for cadastrado.
- **Importar planilha** Excel (`.xlsx`, `.xls`) ou `.csv`:
  - mostra um resumo antes de confirmar;
  - cria os clientes que não existem;
  - ignora documentos repetidos;
  - aponta as linhas com erro.
- **Modelo de planilha** para download, com uma aba de instruções.
- **Backup em JSON:** exportar e restaurar, para levar os dados a outro computador ou navegador.
- **Carregar exemplos** e **Limpar tudo**, no menu *Dados*.

### Interface
- **Tema claro e escuro:** a escolha fica salva no navegador. Na primeira visita, segue o tema do sistema.
- **Layout responsivo:** funciona no computador e no celular.

---

## 🛠️ Tecnologias

- HTML5, CSS3 (variáveis CSS para os temas) e JavaScript puro
- [Tailwind CSS](https://tailwindcss.com/) via CDN
- [SheetJS](https://sheetjs.com/) via CDN, para ler e gerar planilhas
- Fonte [Inter](https://fonts.google.com/specimen/Inter)

---

## 📁 Estrutura

```
painel-vencimentos/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
└── README.md
```

---

## 🚀 Como usar

1. Clone o repositório:
   ```bash
   git clone https://github.com/SEU-USUARIO/painel-vencimentos.git
   ```
2. Abra o arquivo `index.html` no navegador.
3. Cadastre clientes e documentos, importe uma planilha ou use **Dados → Carregar exemplos** para testar.

> É necessário estar conectado à internet, porque o Tailwind, o SheetJS e a fonte são carregados via CDN.

---

## 📊 Importação de planilha

Baixe o modelo em **Dados → Baixar modelo de planilha**. Cada linha é um documento, e o mesmo cliente pode aparecer em várias linhas.

| Coluna        | Obrigatória | Observação                                       |
|---------------|-------------|--------------------------------------------------|
| Cliente       | Sim*        | Nome ou razão social                             |
| CNPJ/CPF      | Sim*        | Com ou sem pontuação                             |
| Tipo          | Sim         | Aceita variações: "certificado digital", "CRF FGTS", "certidão receita federal"... |
| Vencimento    | Sim         | `dd/mm/aaaa`, `aaaa-mm-dd` ou data do Excel      |
| Número, Emissão, Responsável, Observações | Não | —                         |
| Regime, E-mail, Telefone, Contato | Não | Usados só ao criar um cliente novo       |

\* Informe pelo menos um dos dois. O cliente é localizado pelo CNPJ/CPF e, se não houver, pelo nome.

Dica: prefira `.xlsx`. Arquivos `.csv` salvos pelo Excel podem perder os acentos.

---

## 🚦 Regras de status

| Status        | Condição                   |
|---------------|----------------------------|
| Vencido       | Data de vencimento passou  |
| Até 7 dias    | Vence em 0 a 7 dias        |
| 8 a 15 dias   | Vence em 8 a 15 dias       |
| 16 a 30 dias  | Vence em 16 a 30 dias      |
| Em dia        | Vence em mais de 30 dias   |

O status de cada cliente é o do seu documento mais crítico.

---

## ⚠️ Sobre os dados

Os dados ficam salvos **apenas no navegador** em que foram cadastrados. Limpar os dados de navegação apaga o painel. Exporte um backup com frequência.

---

## 🗺️ Próximos passos

- [x] Cadastro de clientes e documentos
- [x] Importação de planilha (Excel/CSV)
- [x] Salvamento no navegador e backup em JSON
- [ ] Botão "Renovado", com histórico de vencimentos
- [ ] Status de andamento (pendente, em renovação, concluído)
- [ ] Validade padrão por tipo de documento
- [ ] Mensagem pronta para WhatsApp/e-mail do cliente
- [ ] Relatórios em PDF/Excel
- [ ] Back-end com login e dados compartilhados pela equipe

---

## 📄 Licença

Distribuído sob a licença MIT.

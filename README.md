# 📅 Painel de Vencimentos

Painel web para escritórios de contabilidade acompanharem, em uma única tela, tudo que vence nos clientes: **certificado digital A1**, **certidões negativas** (CND Federal, Estadual, Municipal e CRF FGTS), **alvarás**, **procurações** e **licenças**.

O painel mostra o que vence em **7, 15 e 30 dias**, destaca o que já venceu e exibe a situação de cada cliente.

---

## ✨ Funcionalidades

- **Resumo por prazo:** cards com a quantidade de documentos vencidos, até 7 dias, 8 a 15, 16 a 30 e em dia. Clicar em um card filtra a lista.
- **Faixa de situação geral:** fica vermelha quando há documentos vencidos ou vencendo na semana.
- **Visão por documento:** tabela ordenada pelo vencimento mais próximo, com barra de prazo, status e responsável.
- **Visão por cliente:** um card por cliente, colorido pelo documento mais crítico.
- **Filtros:** busca por nome ou CNPJ, tipo de documento e período.
- **Tema claro e escuro:** a escolha fica salva no navegador. Na primeira visita, segue o tema do sistema.
- **Dados de exemplo:** o painel abre vazio. O botão **Carregar exemplos** preenche com dados fictícios para demonstração, e **Limpar tudo** remove tudo.
- **Layout responsivo:** funciona no computador e no celular.

---

## 🛠️ Tecnologias

- HTML5
- CSS3 (variáveis CSS para os temas)
- JavaScript puro (sem frameworks)
- [Tailwind CSS](https://tailwindcss.com/) via CDN
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
3. Clique em **Carregar exemplos** para ver o painel funcionando.

> É necessário estar conectado à internet, porque o Tailwind e a fonte são carregados via CDN.

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

## 🗺️ Próximos passos

- [ ] Cadastro de clientes e documentos pela própria tela
- [ ] Importação de planilha (CSV/Excel)
- [ ] Salvar os dados (localStorage ou back-end)
- [ ] Exportar relatório de vencimentos
- [ ] Alertas por e-mail ou WhatsApp

---

## 📄 Licença

Distribuído sob a licença MIT.

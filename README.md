# Say Store — Sistema de Estoque e Financeiro (Impressão 3D)

Aplicação web local para uma loja de impressão 3D. Controla **materiais**, **produtos com ficha
técnica**, **baixa automática de estoque** por envio, **precificação por plataforma de venda**
(Shopee, TikTok Shop) e um **módulo financeiro** completo (contas, saques com direcionamento de
lucro, contas a pagar parceladas e projeção de fluxo de caixa).

Todos os cálculos (custo médio ponderado, custo de produto, preço sugerido, taxas, lucro e saldos)
são feitos no **back-end**, dentro de **transações de banco**.

- **Idioma:** Português do Brasil · **Moeda:** R$ 0,00 · **Datas:** DD/MM/AAAA
- Uso por **uma pessoa** (sem cadastro de usuários nesta versão).

---

## Tecnologias

- **Front-end:** React + Vite + Tailwind CSS + React Router
- **Back-end:** Node.js + Express
- **Banco de dados:** SQLite (arquivo local)
- **ORM:** Prisma

## Pré-requisitos

- **Node.js 18 ou superior** (recomendado 20+). Verifique com `node -v`.
- npm (vem junto com o Node).

---

## Instalação e execução (passo a passo)

Abra um terminal na pasta `estoque-3d`.

### 1. Instalar dependências

```bash
npm run install:all
```

### 2. Configurar o banco de dados

No Windows (PowerShell):

```bash
cd server
copy .env.example .env
```

No Mac/Linux use `cp .env.example .env`. Depois, ainda na pasta `server`:

```bash
npx prisma generate
npx prisma migrate deploy
npm run seed
```

> Atalho: a partir da pasta raiz, `npm run setup:db` executa os três comandos acima de uma vez.

### 3. Rodar o back-end (terminal 1, pasta `server`)

```bash
npm run dev
```

A API sobe em **http://localhost:3001**.

### 4. Rodar o front-end (terminal 2, pasta `client`)

```bash
npm run dev
```

A interface abre em **http://localhost:5173** (o Vite faz proxy de `/api` para a porta 3001).

---

## Funcionalidades

### Estoque
- Cadastro de **materiais** (com campos extras para filamento: tipo, marca, cor, peso).
- **Entrada/reposição** de estoque com **custo médio ponderado** (4 casas decimais internas).
- **Ajuste manual** (adicionar/remover/definir) com motivo obrigatório.
- **Lista de compras** automática (materiais no/abaixo do mínimo).
- **Pop-up de alerta** ao abrir o sistema quando há estoque baixo/zerado.
- **Valor financeiro do estoque** (total, por categoria, por material).

### Produção
- Cadastro de **produtos** + **ficha técnica** editável.
- Cálculo automático do **custo do produto** (recalculado quando o custo de um material muda).
- **Registrar envios** com resumo prévio do consumo, do custo e do resultado financeiro.
- **Baixa automática transacional** do estoque; **bloqueio** quando falta material.
- **Histórico de envios** e **movimentações** com filtros.

### Vendas e finanças (precificação)
- **Plataformas de venda:** cadastro das taxas de cada canal — **% de comissão + taxa fixa por
  item + % de frete grátis**. Vem com **Shopee** e **TikTok Shop** pré-configurados (valores de
  referência editáveis).
- **Precificação:** define **custos extras** e **margem de lucro alvo** por produto; o sistema
  **sugere o preço de venda ideal em cada plataforma** já embutindo custo e taxas, com lucro e
  margem real recalculados na hora.
- **Faturamento e lucro:** resultado dos envios **separado por plataforma** (Shopee × TikTok) —
  faturamento bruto, taxas, custo dos produtos e lucro líquido, com filtro por período.

### Financeiro (fluxo de caixa)
- **Contas:** carteiras com saldo. Vem com **Cora** (saldo disponível) e **Inter** (reserva de
  lucro). Aporte, retirada, ajuste e **extrato** por conta.
- **Saques das plataformas:** registra o valor recebido; um **percentual é direcionado
  automaticamente para a reserva de lucro** (banco separado) e o restante entra na conta operacional.
- **Contas a pagar:** contas únicas ou **parceladas** (cada parcela com vencimento próprio);
  pagamento debita a conta escolhida (transacional) e permite **estorno**.
- **Visão geral / Visão financeira:** saldo disponível, lucro acumulado, contas a pagar e
  **projeção de fluxo de caixa mês a mês** (saldo projetado, com alerta quando fica negativo).

---

## Estrutura de pastas

```
estoque-3d/
├── package.json            Scripts de conveniência (install:all, setup:db, dev:*)
├── README.md               (este arquivo)
├── CONTEXTO-PARA-CLAUDE.md  Resumo para retomar o desenvolvimento
├── server/                 Back-end (porta 3001)
│   ├── prisma/
│   │   ├── schema.prisma   Modelagem completa
│   │   ├── migrations/     Migrations (estoque, plataformas/precificação, financeiro)
│   │   └── seed.js         Dados de exemplo
│   ├── src/
│   │   ├── index.js        Servidor Express
│   │   ├── routes/         materiais, produtos, envios, plataformas, precificacao,
│   │   │                   faturamento, contasFinanceiras, saques, contasPagar, financeiro, ...
│   │   ├── services/       custoService, estoqueService, precoService, financeiroService
│   │   └── utils/money.js  round4/round2 e custo médio ponderado
│   └── tests/estoque.test.js
└── client/                 Front-end (porta 5173)
    ├── public/logo.png     Logo da Say Store (adicione seu arquivo aqui)
    └── src/
        ├── App.jsx         Rotas
        ├── api.js          Cliente HTTP
        ├── format.js       Formatação pt-BR (moeda/data/número)
        ├── components/     Layout (sidebar), Logo, AlertaPopup, Modal, Toast
        └── pages/          Dashboard, Materiais, Entradas, Produtos, Envios, Plataformas,
                            Precificacao, Faturamento, Financeiro, ContasFinanceiras,
                            Saques, ContasPagar, ...
```

---

## Logo

A marca **Say Store** aparece no menu lateral, no cabeçalho e no ícone da aba. Para usar seu logo
oficial, salve o arquivo em **`client/public/logo.png`** — ele substitui automaticamente a versão
vetorial de fallback. Enquanto não houver o arquivo, uma versão vetorial da marca é exibida.

---

## Comandos úteis

| Ação | Comando | Pasta |
|------|---------|-------|
| Instalar tudo | `npm run install:all` | raiz |
| Preparar banco + seed | `npm run setup:db` | raiz |
| Rodar back-end | `npm run dev` | `server` |
| Rodar front-end | `npm run dev` | `client` |
| Rodar testes | `npm test` | raiz ou `server` |
| Abrir Prisma Studio (ver dados) | `npx prisma studio` | `server` |
| Recriar banco do zero | `npx prisma migrate reset` | `server` |

> ⚠️ **Nunca** rode `npm run seed` depois de cadastrar dados reais — ele recria os dados de exemplo.

---

## Regras de negócio (principais)

- Custo unitário da compra = valor total ÷ quantidade; **custo médio ponderado** recalculado a
  cada entrada (4 casas internas, 2 na exibição).
- Ao mudar o custo médio de um material, **os produtos que o usam são recalculados**.
- **Preço sugerido** por plataforma: `preço = (custo final + taxa fixa) / (1 − taxas% − margem%)`.
- **Saque:** `valor do lucro = bruto × %`; o líquido entra na conta operacional e o lucro na reserva.
- Baixa de estoque e pagamentos são **transacionais** (tudo ou nada); não há estoque negativo por envio.
- Materiais/produtos com histórico só podem ser **inativados**, não excluídos.
- Situações de estoque: **Normal** (> mínimo), **Baixo** (> 0 e ≤ mínimo), **Sem estoque** (≤ 0).

---

## Backup do banco de dados

O banco é um único arquivo: **`server/prisma/dev.db`** (caminho definido em `server/.env`).

**Fazer backup** (servidor parado ou sem gravações):

```bash
# Windows (PowerShell)
Copy-Item server\prisma\dev.db "backup-estoque-$(Get-Date -Format yyyy-MM-dd).db"

# Linux/macOS
cp server/prisma/dev.db "backup-estoque-$(date +%Y-%m-%d).db"
```

**Restaurar:** pare o servidor e substitua `server/prisma/dev.db` pelo arquivo de backup
(renomeando-o de volta para `dev.db`). Recomenda-se um backup diário.

---

## Testes

Na pasta `server`:

```bash
npm test
```

Cobrem os cálculos de custo unitário, custo médio ponderado, custo de produto, consumo por envio,
consolidação de material em vários produtos, bloqueio por estoque insuficiente e as situações de estoque.

---

## Acesso por senha

O sistema é protegido por uma **senha única** (variável `APP_PASSWORD`). Ao abrir, uma tela de login
pede a senha; após entrar, o acesso fica salvo no navegador (botão **Sair** na barra lateral encerra a
sessão). Localmente, a senha de desenvolvimento fica em `server/.env`.

## Hospedar na nuvem

Para acessar de qualquer lugar, o sistema vai para **Vercel** (site) + **Railway** (API, com o banco
SQLite num volume persistente). O passo a passo completo está em **[DEPLOY.md](DEPLOY.md)**.

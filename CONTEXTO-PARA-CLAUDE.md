# Contexto do projeto — para continuar com o Claude

> Este arquivo é um resumo para retomar o desenvolvimento deste sistema em uma nova
> conversa com o Claude. Cole o conteúdo dele (ou anexe o arquivo) no início do novo chat
> e diga: "Estou continuando este projeto, aqui está o contexto." Assim o Claude entende
> tudo que já foi feito sem você precisar reexplicar.

---

## 1. O que é o projeto

Sistema **web local** de controle de estoque para uma **loja de impressão 3D**, usado por
**uma única pessoa** (sem login/cadastro de usuários nesta versão). Controla materiais
(filamentos, cola, argolas, caixas, etiquetas, etc.), produtos com **ficha técnica**
(quanto de cada material entra em cada produto), e faz a **baixa automática de estoque**
quando o usuário registra os produtos enviados no dia.

Interface em **português do Brasil**, moeda em **R$ 0,00**, datas em **DD/MM/AAAA**.

## 2. Tecnologias (não trocar sem avisar o usuário)

- **Front-end:** React + Vite + Tailwind CSS + React Router
- **Back-end:** Node.js + Express
- **Banco de dados:** SQLite (arquivo local)
- **ORM:** Prisma
- **Node.js:** v24 instalado na máquina do usuário (Windows)

## 3. Estado atual (o que já está pronto e funcionando)

O usuário **já rodou o sistema com sucesso** na máquina dele. O back-end, o banco e o
front-end sobem e funcionam. O banco foi populado com os **dados de exemplo (seed)** e o
usuário **ainda não cadastrou dados reais** — só tem o seed.

### Funcionalidades implementadas (versão mínima completa)
- Cadastro de materiais (com campos extras para filamento: tipo, marca, cor, peso).
- Entrada/reposição de estoque com **custo médio ponderado** (4 casas decimais internas).
- Cadastro de produtos + **ficha técnica** editável.
- Cálculo automático do **custo do produto** (recalculado quando o custo de um material muda).
- **Registrar envios** com resumo prévio (preview) do consumo e do custo.
- **Baixa automática transacional** do estoque a partir das fichas técnicas.
- **Bloqueio** de envio quando falta material (mensagem com faltante).
- **Ajuste manual** de estoque (adicionar/remover/definir) com motivo obrigatório.
- **Histórico de movimentações** com filtros.
- **Lista de compras** automática (materiais no/abaixo do mínimo).
- **Pop-up de alerta** ao abrir o sistema quando há estoque baixo/zerado.
- **Valor financeiro do estoque** (total, por categoria, por material).
- **Dashboard** com cartões, urgentes, últimas movimentações e últimos envios.
- **11 testes automatizados** de cálculo passando (custo médio, custo de produto, consumo,
  bloqueio por insuficiência, situações de estoque).

### Design / visual (já aplicado)
O visual foi repaginado para um tema **"painel de produção" profissional**:
- Paleta **laranja industrial** (`#E8590C`, âmbar de filamento aquecido) usada com disciplina.
- **Menu lateral em grafite escuro** (`#1C1B1A`), itens agrupados por seção, ícones, item ativo laranja.
- Tipografia: **Plus Jakarta Sans** (títulos) + **Inter** (corpo), via Google Fonts.
- Cartões, badges com bolinha de status, modais e pop-up repaginados.
- Cores/tokens definidos em `client/tailwind.config.js` (paletas `marca`, `grafite`, `base`).

## 4. Estrutura de pastas (resumo)

```
estoque-3d/
├── package.json            Scripts de conveniência (install:all, setup:db, dev:*)
├── README.md               Instruções completas de instalação/uso/backup
├── CONTEXTO-PARA-CLAUDE.md  (este arquivo)
├── server/                 Back-end
│   ├── prisma/
│   │   ├── schema.prisma   Modelagem (12 entidades)
│   │   ├── migrations/     Migration inicial (cria todas as tabelas)
│   │   └── seed.js         Dados de exemplo
│   ├── src/
│   │   ├── index.js        Servidor Express (porta 3001)
│   │   ├── routes/         materiais, categorias, unidades, fornecedores, entradas,
│   │   │                   produtos, envios, movimentacoes, ajustes, listaCompras, dashboard
│   │   ├── services/       custoService (recálculo), estoqueService (situação)
│   │   └── utils/money.js  round4/round2 e custo médio ponderado
│   └── tests/estoque.test.js
└── client/                 Front-end (porta 5173)
    └── src/
        ├── App.jsx         Rotas
        ├── api.js          Cliente HTTP (fetch p/ /api, proxy do Vite)
        ├── format.js       Formatação pt-BR (moeda/data/número)
        ├── components/     Layout (sidebar), AlertaPopup, Modal, Toast
        └── pages/          Dashboard, Materiais, Entradas, Produtos, ProdutoDetalhe,
                            Envios, HistoricoEnvios, EnvioDetalhe, Movimentacoes,
                            Ajustes, ListaCompras, ValorEstoque
```

## 5. Entidades do banco (Prisma)

Material, CategoriaMaterial, UnidadeMedida, Fornecedor, FilamentoDetalhe, EntradaEstoque,
Produto, ItemFichaTecnica, RegistroEnvio, ItemRegistroEnvio, MovimentacaoEstoque, AjusteEstoque.

Regras-chave: cálculos sempre no back-end; baixa em transação (tudo ou nada); não permite
estoque negativo por envio; materiais/produtos com histórico só podem ser inativados, não
excluídos; ao mudar custo médio de um material, os produtos que o usam são recalculados.

## 6. Como rodar (resumo — detalhes no README.md)

Na primeira vez:
```
npm run install:all
cd server
copy .env.example .env       (Windows; no Mac/Linux: cp)
npx prisma generate
npx prisma migrate deploy
npm run seed
```
No dia a dia, dois terminais:
```
# terminal 1 (pasta server)
npm run dev        -> API em http://localhost:3001
# terminal 2 (pasta client)
npm run dev        -> site em http://localhost:5173
```
Abrir `http://localhost:5173` no navegador.

Backup do banco: copiar o arquivo `server/prisma/dev.db`.

## 7. Como alterar (para o usuário)

- **Visual (arquivos em client/):** hot reload — salvar o arquivo já atualiza a página.
- **Regras/API (arquivos em server/):** parar o back-end (Ctrl+C) e rodar `npm run dev` de novo.
- **Estrutura do banco (schema.prisma):** `npx prisma migrate dev` + `npx prisma generate` na pasta server.
- **Nunca** rodar `npm run seed` depois de ter dados reais (ele recria os dados de exemplo).

## 8. Roadmap — próximos passos ainda NÃO implementados (Etapa 2)

Estes recursos foram planejados mas ainda não existem no código:
- Tela de **Configurações** para gerenciar categorias, unidades e fornecedores pela interface.
- **Estorno** de movimentações com um clique (hoje só via ajuste manual).
- **Conversão de unidades** dentro da mesma grandeza (kg↔g, l↔ml, m↔cm).
- **Paginação** avançada nas listagens maiores.
- (Opcional) fazer o back-end recarregar sozinho ao salvar (nodemon), como o front já faz.

## 9. Instruções para o novo Claude

Ao continuar este projeto:
1. Mantenha as **mesmas tecnologias, nomes de entidades e regras de negócio** acima.
2. Ao criar/editar arquivos, entregue-os **completos** (sem "implemente aqui" ou reticências).
3. Todos os **cálculos ficam no back-end**, com 4 casas decimais internas e 2 na exibição.
4. Preserve a **paleta laranja/grafite** e a tipografia já definidas em `tailwind.config.js`.
5. O usuário roda em **Windows**, com Node v24, usando dois terminais (server e client).
6. Se for mexer no banco, lembre de gerar **migration** e avisar que não se deve rodar o seed
   por cima de dados reais.

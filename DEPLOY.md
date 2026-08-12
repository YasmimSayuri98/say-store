# Como colocar o Say Store no ar

Arquitetura: **site (frontend) no Vercel** + **API (backend) no Railway** com o banco SQLite num
volume persistente. O acesso é protegido por **senha única**.

> Você vai precisar criar contas (grátis) no **GitHub**, no **Railway** e no **Vercel**. Os passos
> abaixo são feitos por você — o código já está todo preparado.

---

## 1. Subir o código no GitHub

1. Crie uma conta em [github.com](https://github.com) (se ainda não tiver).
2. Crie um repositório novo (pode ser **privado**), por exemplo `say-store`. Não marque nenhuma opção
   de "adicionar README/gitignore".
3. Na pasta do projeto, o repositório Git já foi inicializado com um primeiro commit. Conecte-o ao
   GitHub e envie (troque a URL pela do seu repositório):

   ```bash
   git remote add origin https://github.com/SEU-USUARIO/say-store.git
   git branch -M main
   git push -u origin main
   ```

---

## 2. API (backend) no Railway

1. Crie conta em [railway.app](https://railway.app) e clique em **New Project → Deploy from GitHub repo**,
   escolhendo o repositório.
2. Nas **Settings** do serviço:
   - **Root Directory**: `server`
   - **Start Command**: `npx prisma migrate deploy && node src/index.js`
3. Adicione um **Volume** (Settings → Volumes → New Volume) montado em **`/data`**. É ele que guarda o
   banco de forma permanente.
4. Em **Variables**, adicione:

   | Variável | Valor |
   |----------|-------|
   | `DATABASE_URL` | `file:/data/prod.db` |
   | `APP_PASSWORD` | a senha que você quer usar para entrar no sistema |
   | `AUTH_SECRET` | um texto longo e aleatório (ex.: gere em [passwordsgenerator.net](https://passwordsgenerator.net)) |
   | `CORS_ORIGIN` | deixe em branco por enquanto (preenchemos no passo 4) |

5. Aguarde o deploy. Em **Settings → Networking → Generate Domain**, gere a URL pública da API
   (algo como `https://say-store-api.up.railway.app`). **Guarde essa URL.**
6. Rode o seed uma vez para criar a configuração básica (unidades, plataformas, contas): abra a aba
   **Shell/Deploy** do serviço no Railway e execute `npm run seed` (ou adicione `&& npm run seed` ao
   final do Start Command apenas no primeiro deploy e remova depois — o seed é seguro de repetir).

---

## 3. Site (frontend) no Vercel

1. Crie conta em [vercel.com](https://vercel.com) e clique em **Add New → Project**, importando o mesmo
   repositório do GitHub.
2. Configure:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite (deve detectar sozinho)
   - **Build Command**: `npm run build` · **Output Directory**: `dist`
3. Em **Environment Variables**, adicione:

   | Variável | Valor |
   |----------|-------|
   | `VITE_API_URL` | a URL pública da API do Railway (passo 2.5) |

4. Clique em **Deploy**. Ao final, o Vercel te dá a URL do site (ex.: `https://say-store.vercel.app`).
   **Guarde essa URL.**

---

## 4. Ligar os dois (CORS)

1. Volte no **Railway → Variables** e preencha `CORS_ORIGIN` com a URL do site no Vercel
   (ex.: `https://say-store.vercel.app`, **sem barra no final**).
2. O Railway reinicia sozinho. Pronto: abra a URL do Vercel, digite sua senha e use o sistema.

---

## Observações

- **Sincronização automática da Shopee**: funciona porque o Railway mantém o processo ligado. Só
  funcionará de verdade depois que a Shopee liberar suas credenciais de produção (Live).
- **Backup do banco**: o banco fica em `/data/prod.db` no volume do Railway. Para baixar uma cópia,
  use o Shell do Railway. Recomenda-se um backup periódico.
- **Trocar a senha**: basta alterar a variável `APP_PASSWORD` no Railway (todos os logins ativos
  continuam válidos até expirar; para invalidá-los na hora, troque também o `AUTH_SECRET`).
- **Atualizar o sistema**: dê `git push` no GitHub — Railway e Vercel reimplantam automaticamente.

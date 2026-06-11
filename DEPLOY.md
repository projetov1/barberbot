# 🚀 BarberBot — Guia de Deploy Completo

## O que você vai precisar (tudo gratuito pra começar)

- Conta no [Railway](https://railway.app) — backend + banco de dados
- Conta no [Vercel](https://vercel.com) — dashboard React
- Conta na [Z-API](https://z-api.io) — conexão WhatsApp (~R$ 60/mês)
- Conta no [GitHub](https://github.com) — pra subir o código

---

## PASSO 1 — Subir o código no GitHub

1. Crie um repositório no GitHub chamado `barberbot`
2. Dentro da pasta `barberbot`, abra o terminal e rode:

```bash
git init
git add .
git commit -m "primeiro commit"
git remote add origin https://github.com/SEU_USUARIO/barberbot.git
git push -u origin main
```

---

## PASSO 2 — Banco de dados + Backend no Railway

1. Acesse [railway.app](https://railway.app) e crie uma conta
2. Clique em **New Project → Deploy from GitHub repo**
3. Selecione o repositório `barberbot` e a pasta `backend`
4. O Railway vai detectar que é Node.js automaticamente

### Adicionar o banco PostgreSQL:
1. No projeto Railway, clique em **+ New → Database → PostgreSQL**
2. Clique no banco criado → aba **Variables**
3. Copie o valor de `DATABASE_URL`

### Configurar as variáveis de ambiente:
No serviço do backend, vá em **Variables** e adicione:

```
DATABASE_URL=           ← cole o valor copiado do banco
ZAPI_INSTANCE_ID=       ← você vai pegar no painel da Z-API
ZAPI_TOKEN=             ← você vai pegar no painel da Z-API
ZAPI_BASE_URL=https://api.z-api.io/instances
BARBER_NAME=            ← ex: Barbearia do João
HUMAN_ATTENDANT_PHONE=  ← número do atendente com DDI (ex: 5581999999999)
FRONTEND_URL=           ← URL do Vercel (preenche depois)
PORT=3000
```

### Rodar as migrations do banco:
No Railway, vá em **Settings → Deploy → Start Command** e coloque:

```
npx prisma generate && npx prisma migrate deploy && node src/index.js
```

Após o deploy, anote a URL do backend (ex: `https://barberbot-backend.railway.app`)

---

## PASSO 3 — Configurar a Z-API

1. Acesse [z-api.io](https://z-api.io) e crie uma conta
2. Crie uma nova instância
3. Vá em **Conectar** e escaneie o QR Code com o WhatsApp da barbearia
4. Copie o **Instance ID** e o **Token** → coloque nas variáveis do Railway
5. Configure o webhook:
   - Em **Webhooks → Receber mensagens**
   - URL: `https://SEU_BACKEND.railway.app/webhook/zapi`
   - Marque: ✅ Mensagens recebidas

---

## PASSO 4 — Dashboard no Vercel

1. Acesse [vercel.com](https://vercel.com) e conecte com o GitHub
2. Clique em **New Project → Import** o repositório `barberbot`
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Create React App
4. Em **Environment Variables** adicione:
   ```
   REACT_APP_API_URL=https://SEU_BACKEND.railway.app
   ```
5. Clique em **Deploy**
6. Após o deploy, copie a URL do Vercel e coloque no `FRONTEND_URL` do Railway

---

## PASSO 5 — Cadastrar os serviços da barbearia

Após tudo no ar, acesse o dashboard e vá na aba **✂️ Serviços**.
Cadastre os cortes e valores — eles vão aparecer automaticamente nas mensagens do bot.

---

## PASSO 6 — Testar

Mande uma mensagem no WhatsApp conectado e veja o bot responder!
Acompanhe tudo no dashboard em tempo real.

---

## Fluxo do bot (o que o cliente vai ver)

```
Cliente manda qualquer mensagem
        ↓
Bot pergunta o nome (se for novo)
        ↓
Menu principal:
  1. Ver serviços e preços
  2. Agendar horário
  3. Falar com atendente
        ↓
Opção 2 → bot pergunta serviço → data → hora
  → registra agendamento
  → avisa o atendente no WhatsApp
        ↓
Opção 3 → transfere para humano (bot para de responder)
  → atendente recebe notificação
```

---

## Custos mensais estimados

| Serviço     | Plano         | Custo       |
|-------------|---------------|-------------|
| Railway     | Hobby         | ~$5/mês     |
| Vercel      | Free          | Grátis      |
| Z-API       | Starter       | ~R$ 60/mês  |
| **Total**   |               | **~R$ 90/mês** |

---

## Suporte

Em caso de dúvida em qualquer etapa, documente o erro e traga aqui.

# 🚀 DEPLOY SENTIX PRO FRONTEND TO VERCEL

## ✅ Vercel CLI Already Installed

Vercel CLI v50.18.0 está listo en tu sistema.

---

## 🔐 Step 1: Login to Vercel (Solo la primera vez)

Ejecuta este comando en tu terminal:

```bash
cd /c/proyectos/Sentix-pro/sentix-pro-frontend
vercel login
```

**Opciones de login**:
1. **Email** - Te enviará un link de verificación
2. **GitHub** - Login con tu cuenta GitHub (recomendado)
3. **GitLab** - Login con GitLab
4. **Bitbucket** - Login con Bitbucket

**Recomendado**: Usa GitHub para auto-conectar tus repos.

---

## 🚀 Step 2: Deploy to Production

Una vez que hayas hecho login, ejecuta:

```bash
cd /c/proyectos/Sentix-pro/sentix-pro-frontend
vercel --prod
```

**Preguntas que te hará Vercel**:

```
? Set up and deploy "sentix-pro-frontend"? [Y/n]
→ Y (presiona Enter)

? Which scope do you want to deploy to?
→ Selecciona tu cuenta personal

? Link to existing project? [y/N]
→ N (es un proyecto nuevo)

? What's your project's name?
→ sentix-pro-frontend (o el nombre que prefieras)

? In which directory is your code located?
→ ./ (presiona Enter, es el directorio actual)

? Want to override the settings? [y/N]
→ N (presiona Enter, usa settings por defecto)
```

Vercel detectará automáticamente que es Next.js y configurará todo.

---

## ⚙️ Step 3: Set Environment Variable

Después del deploy, necesitas configurar la URL del backend:

### Opción A: Via Web Dashboard (Recomendado)

1. Ve a: https://vercel.com/dashboard
2. Click en tu proyecto `sentix-pro-frontend`
3. Click "Settings" → "Environment Variables"
4. Agregar nueva variable:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://YOUR-RAILWAY-URL.up.railway.app`
   - **Environments**: Selecciona Production, Preview, Development
5. Click "Save"
6. Click "Redeploy" para aplicar cambios

### Opción B: Via CLI

```bash
# Primero, obtén tu Railway URL del backend
# Luego ejecuta:
vercel env add NEXT_PUBLIC_API_URL production
# Cuando te pida el valor, pega tu Railway URL
```

---

## 🔗 Step 4: Get Your Production URL

Después del deploy, Vercel te dará una URL:

```
✅ Production: https://sentix-pro-frontend.vercel.app
```

**O verás algo como**:
```
https://sentix-pro-frontend-youruser.vercel.app
```

---

## 🧪 Step 5: Test Production

```bash
# Visita tu URL de Vercel
curl https://sentix-pro-frontend.vercel.app

# O abre en el browser
start https://sentix-pro-frontend.vercel.app
```

---

## 📝 Alternative: Deploy via Git (Auto-Deploy)

Si prefieres auto-deploy en cada push:

### 1. Connect Vercel to GitHub

1. Ve a https://vercel.com/new
2. Click "Import Git Repository"
3. Selecciona `sentix-pro-frontend`
4. Click "Import"
5. Configure:
   - **Framework Preset**: Next.js (auto-detectado)
   - **Root Directory**: ./
   - **Build Command**: `npm run build` (auto)
   - **Output Directory**: `.next` (auto)
6. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL` = Tu Railway URL
7. Click "Deploy"

### 2. Auto-Deploy Setup

Ahora cada vez que hagas `git push` a GitHub, Vercel desplegará automáticamente.

```bash
# Haz un cambio
git add .
git commit -m "Update"
git push origin main

# Vercel deploy automático se activa
# Ve el progreso en https://vercel.com/dashboard
```

---

## 🔧 Troubleshooting

### Error: "No credentials found"
**Solución**: Ejecuta `vercel login` primero

### Error: "Build failed"
**Posibles causas**:
1. Falta dependencia: `npm install` en local primero
2. Error en código: Revisa logs en Vercel dashboard
3. Environment variable no configurada

**Ver logs**:
```bash
vercel logs
```

### Frontend no conecta con backend
**Checklist**:
- [ ] `NEXT_PUBLIC_API_URL` configurada en Vercel
- [ ] Railway backend está corriendo
- [ ] CORS habilitado en backend
- [ ] Railway URL es correcta (con https://)

### Deploy pero página en blanco
**Solución**:
1. Check browser console (F12)
2. Verificar environment variables
3. Ver logs en Vercel: https://vercel.com/dashboard → Logs

---

## 🎯 Quick Commands Cheat Sheet

```bash
# Login (primera vez)
vercel login

# Deploy to production
vercel --prod

# Deploy to preview
vercel

# Check status
vercel ls

# View logs
vercel logs

# Remove deployment
vercel remove sentix-pro-frontend

# Environment variables
vercel env ls                    # List
vercel env add VAR_NAME          # Add
vercel env rm VAR_NAME           # Remove
```

---

## 📊 Expected Output

Cuando el deploy sea exitoso, verás:

```
🔍  Inspect: https://vercel.com/youruser/sentix-pro-frontend/...
✅  Production: https://sentix-pro-frontend.vercel.app [1s]
```

---

## 🎨 Custom Domain (Optional)

Para usar un dominio personalizado:

1. Ve a Vercel Dashboard → tu proyecto
2. Click "Settings" → "Domains"
3. Agregar tu dominio (ej: sentix-pro.com)
4. Configurar DNS según instrucciones de Vercel
5. Esperar propagación DNS (puede tomar hasta 24h)

---

## 🔄 Redeploy After Changes

```bash
# Opción 1: Manual redeploy
cd /c/proyectos/Sentix-pro/sentix-pro-frontend
vercel --prod

# Opción 2: Git push (si configuraste auto-deploy)
git add .
git commit -m "Update frontend"
git push origin main
# Auto-deploy se activa

# Opción 3: Via Vercel Dashboard
# Ve a https://vercel.com/dashboard
# Click proyecto → Deployments → Redeploy
```

---

## ✅ Production Checklist

Antes de considerar production-ready:

- [ ] Vercel deploy exitoso
- [ ] Environment variable `NEXT_PUBLIC_API_URL` configurada
- [ ] Frontend carga en browser
- [ ] Backend API responde (check con curl)
- [ ] Componentes multi-wallet integrados
- [ ] Test: Crear wallet funciona
- [ ] Test: Upload CSV funciona
- [ ] Test: P&L se calcula correctamente
- [ ] Custom domain configurado (opcional)
- [ ] Analytics habilitadas (opcional)

---

## 📞 Need Help?

**Vercel Docs**: https://vercel.com/docs
**Vercel Support**: https://vercel.com/support
**Next.js Docs**: https://nextjs.org/docs

**Common Issues**:
- Build errors → Check `npm run build` locally first
- API not connecting → Verify environment variables
- 404 errors → Check routing in Next.js

---

## 🎉 After Successful Deploy

Tu frontend estará disponible en:
- **Production**: https://sentix-pro-frontend.vercel.app
- **Auto HTTPS**: ✅ (Vercel lo provee gratis)
- **Auto CDN**: ✅ (Global edge network)
- **Auto SSL**: ✅ (Certificado SSL gratis)

**Performance**:
- ⚡ Edge Functions para API routes
- 🌍 CDN global (sub-100ms latency)
- 📦 Optimized builds automáticos
- 🔄 Instant rollbacks disponibles

---

## 🚀 Ready to Deploy?

**Run these commands**:

```bash
cd /c/proyectos/Sentix-pro/sentix-pro-frontend

# Step 1: Login
vercel login

# Step 2: Deploy
vercel --prod

# Step 3: Configure env var (via dashboard o CLI)

# Step 4: Test
# Visit your Vercel URL
```

---

**⏱️ Estimated Time**: 5-10 minutes

**🎯 Result**: Frontend live en Vercel con auto-deploy configurado

---

Built by: Claude Sonnet 4.5 + Edgardo Alonso
Date: 2024-02-16

---

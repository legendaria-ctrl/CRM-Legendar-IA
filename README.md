# Legendar-IA CRM

CRM interno para llevar el control de clientes de la certificación **Legendar-IA**: alta manual de clientes, línea de tiempo de cada uno (llegada → invitación → aceptación → renovación), temporizador de membresía anual (365 días desde la aceptación) y sincronización en tiempo real entre varios usuarios conectados a la vez.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **Firebase Firestore** como base de datos, con `onSnapshot` para tiempo real
- Sesión propia por cookie firmada (`jose`) con dos roles: `ADMIN` y `VENDEDOR`, cada uno con una clave de acceso compartida — el usuario solo escribe su nombre, que queda registrado como autor de cada evento del timeline
- Iconos con `lucide-react`

## Configuración local

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Copia `.env.example` a `.env` y completa los valores:
   - La config de Firebase la encuentras en Firebase Console → Configuración del proyecto → Tus apps → Config del SDK.
   - `ADMIN_PASSCODE` y `VENDEDOR_PASSCODE`: las claves de acceso que usarán tus vendedores y administradores.
   - `SESSION_SECRET`: genera uno con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
3. En Firebase Console, crea la base de datos de **Firestore** (modo producción) y publica estas reglas (no se usa Firebase Auth, la protección la da el login propio de la app):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
4. Corre el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000).

## Deploy en Vercel

1. Importa este repositorio en [vercel.com/new](https://vercel.com/new).
2. Vercel detecta Next.js automáticamente, no requiere configuración adicional de build.
3. Antes del primer deploy, agrega en **Project Settings → Environment Variables** las mismas variables de `.env.example` (con tus valores reales).
4. Cada push a `main` despliega automáticamente.

## Estructura relevante

- `src/lib/firebase.ts` — inicialización del cliente de Firestore.
- `src/lib/clientesService.ts` — CRUD y listeners en tiempo real de clientes/eventos.
- `src/lib/session.ts` / `src/lib/session-context.tsx` — sesión por cookie firmada y contexto de React.
- `src/proxy.ts` — protege las rutas privadas (antes `middleware.ts`, renombrado por la convención de Next 16).
- `src/app/(app)/` — dashboard, alta y detalle de cliente (rutas protegidas).

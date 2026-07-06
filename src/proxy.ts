import { NextResponse, type NextRequest } from "next/server";
import { verificarSesion, COOKIE_NAME } from "@/lib/session";

export default async function proxy(req: NextRequest) {
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");
  const isSessionApi = req.nextUrl.pathname.startsWith("/api/session");
  // Endpoint server-a-servidor para que otro CRM consulte si un cliente ya
  // existe aquí; no lleva cookie de sesión, se protege con una clave propia
  // dentro de la ruta (ver src/app/api/clientes/existe/route.ts).
  const isClienteExisteApi = req.nextUrl.pathname.startsWith("/api/clientes/existe");

  if (isSessionApi || isClienteExisteApi) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const sesion = token ? await verificarSesion(token) : null;
  const isLoggedIn = !!sesion;

  if (!isLoggedIn && !isLoginPage) {
    const url = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isLoginPage) {
    const url = new URL("/", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$).*)",
  ],
};

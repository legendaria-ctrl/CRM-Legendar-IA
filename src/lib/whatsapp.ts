function primerNombre(nombreCompleto: string): string {
  return nombreCompleto.trim().split(/\s+/)[0] ?? nombreCompleto;
}

export function mensajeBienvenida(nombreCliente: string): string {
  const nombre = primerNombre(nombreCliente);
  return `🚀 *¡BIENVENIDO A LEGENDAR-IA ${nombre}!* 🚀

Felicidades por dar este paso. 🔥

Acabas de unirte a una experiencia diseñada para ayudarte a implementar Inteligencia Artificial de manera práctica, estratégica y aplicada a resultados reales en tu negocio y tu vida.

Para comenzar correctamente, sigue estos pasos:

📩 _*Revisa tu correo electrónico*_

*En un plazo máximo de 24 horas recibirás 2 correos importantes de parte de _Certificación Legendaria:_*

✅ Correo de Bienvenida
Encontrarás información clave sobre tu acceso, cómo funciona la certificación y qué hacer para aprovecharla al máximo.

✅ Invitación a la Comunidad Privada de Skool (LEGENDAR-IA)
Este será tu centro de operaciones durante toda la certificación.

Dentro encontrarás:
✔️ Sesiones en vivo
✔️ Materiales y recursos
✔️ Grabaciones
✔️ Retos y actividades
✔️ Comunidad

⚠️ *IMPORTANTE:*
Es indispensable que aceptes tu invitación y te unas a la comunidad, ya que ahí se realizarán las sesiones y recibirás toda la información oficial.

🎯 *Tu siguiente paso:*
Revisa tu correo y únete a la comunidad lo antes posible para que estés listo desde el primer día.

❗ Si no recibes tu invitación durante las próximas 24 horas o tienes cualquier inconveniente, responde directamente a este mensaje y con gusto te ayudaremos.

Nos vemos dentro de *LEGENDAR-IA*. 🔥🤖`;
}

// wa.me solo acepta el número en formato internacional, sin espacios,
// paréntesis ni guiones (el "+" es opcional y se puede omitir).
//
// Los clientes de región US necesitan el "1" de EEUU antes del número. Y
// algunos clientes de región MX en realidad viven en EEUU (pagan el plan MX)
// y ya tienen guardado su número completo con el 1 — a esos no hay que
// tocarles la región, solo respetar el 1 que ya traen para este botón.
export function construirLinkWhatsapp(
  telefono: string,
  mensaje: string,
  region?: string | null
): string {
  let numero = telefono.replace(/[^0-9]/g, "");
  const yaEsNumeroUsCompleto = numero.length === 11 && numero.startsWith("1");

  if (region === "US" && !yaEsNumeroUsCompleto && numero.length === 10) {
    numero = `1${numero}`;
  }

  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

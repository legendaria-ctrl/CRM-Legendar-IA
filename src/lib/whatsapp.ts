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
export function construirLinkWhatsapp(telefono: string, mensaje: string): string {
  const numero = telefono.replace(/[^0-9]/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

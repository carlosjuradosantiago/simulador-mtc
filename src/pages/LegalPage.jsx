import { Building2, Mail, MapPin, Phone } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BRAND_DISCLAIMER, BRAND_NAME } from '../data/brand.js';
import { BUSINESS, MONTHLY_PLAN } from '../data/legal.js';

const pages = {
  terms: {
    title: 'Términos y condiciones',
    intro: 'Estas condiciones explican de forma sencilla cómo funciona Simulador MTC y qué aceptas al crear una cuenta o contratar la suscripción.',
    sections: [
      ['1. Proveedor del servicio', <p key="provider">El servicio es ofrecido por <strong>{BUSINESS.legalName}</strong>, RUC {BUSINESS.ruc}, con domicilio en {BUSINESS.address}. Puedes contactarnos en <a className="font-bold text-brand hover:underline" href={BUSINESS.emailHref}>{BUSINESS.email}</a> o al <a className="font-bold text-brand hover:underline" href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>.</p>],
      ['2. Servicio educativo', <><p>{BRAND_NAME} permite practicar preguntas de conocimientos para licencias de conducir por categoría, rendir simulacros cronometrados y revisar resultados y temas por reforzar.</p><p className="mt-3">{BRAND_DISCLAIMER} La plataforma no reemplaza la información oficial ni garantiza la aprobación del examen.</p></>],
      ['3. Práctica gratuita', <p>Las prácticas cortas están disponibles gratuitamente para que conozcas el contenido y el funcionamiento del servicio antes de contratar una suscripción.</p>],
      ['4. Suscripción mensual', <><p>La suscripción cuesta <strong>S/ {MONTHLY_PLAN.price} por mes</strong> e incluye acceso a los simulacros completos, resultados, revisión de errores y seguimiento del progreso durante el periodo activo.</p><p className="mt-3">Con tarjeta, el cobro se renueva mensualmente hasta que canceles la renovación. Con Yape, el acceso dura un mes y no se realiza un cobro automático; al vencer podrás suscribirte nuevamente.</p></>],
      ['5. Pagos y comprobantes', <p>Los pagos son procesados por Culqi. Simulador MTC no recibe ni almacena el número completo de tu tarjeta. Antes de pagar podrás elegir boleta o factura e ingresar los datos necesarios para el comprobante.</p>],
      ['6. Cuenta y uso permitido', <p>Debes proporcionar información verdadera, mantener tus credenciales seguras y usar la cuenta de forma personal. No está permitido copiar masivamente el banco de preguntas, vulnerar la plataforma, compartir accesos con fines comerciales ni usar el servicio de forma ilícita.</p>],
      ['7. Cancelación', <p>Puedes detener la renovación automática de tu tarjeta desde la sección de suscripción. No habrá nuevos cobros y conservarás el acceso hasta terminar el periodo ya pagado. Los pagos con Yape terminan automáticamente al cumplirse el mes.</p>],
      ['8. Cambios, devoluciones y reclamos', <p>Las solicitudes económicas se atienden según nuestra <Link className="font-bold text-brand hover:underline" to="/politica-de-cambios-y-devoluciones">Política de cambios y devoluciones</Link>. También puedes presentar una queja o reclamo en el <Link className="font-bold text-brand hover:underline" to="/libro-reclamaciones">Libro de Reclamaciones</Link>.</p>],
      ['9. Propiedad intelectual y disponibilidad', <p>El diseño, software, organización y contenido propio de la plataforma están protegidos por la legislación aplicable. Podemos realizar mantenimiento o correcciones razonables para mantener el servicio seguro y actualizado.</p>],
      ['10. Ley aplicable', <p>Estas condiciones se interpretan conforme a las leyes de la República del Perú, incluido el Código de Protección y Defensa del Consumidor. Ninguna disposición limita derechos irrenunciables reconocidos por ley.</p>],
    ],
  },
  returns: {
    title: 'Política de cambios y devoluciones',
    intro: 'Queremos que conozcas el servicio antes de pagar y que sepas exactamente en qué casos corresponde revisar un cobro.',
    sections: [
      ['Prueba antes de suscribirte', <p key="preview">Las prácticas cortas son gratuitas y permiten revisar la interfaz, el tipo de preguntas y las explicaciones antes de contratar la suscripción mensual.</p>],
      ['Servicio digital de acceso inmediato', <p>La suscripción activa inmediatamente el acceso digital a simulacros completos, resultados y análisis durante un mes. Por ese motivo, una vez activado el acceso no ofrecemos devolución por cambio de opinión, falta de uso o por no aprobar un examen.</p>],
      ['Casos que sí revisamos', <><p>Evaluaremos y, cuando corresponda, corregiremos o devolveremos importes por:</p><ul className="mt-3 list-disc space-y-2 pl-6"><li>cobro duplicado o por un importe distinto al mostrado;</li><li>pago confirmado sin activación del acceso;</li><li>operación no reconocida, sujeta a la validación del medio de pago;</li><li>cualquier supuesto exigido por las normas de protección al consumidor.</li></ul></>],
      ['Cómo solicitar una revisión', <p>Escríbenos a <a className="font-bold text-brand hover:underline" href={BUSINESS.emailHref}>{BUSINESS.email}</a> indicando tu nombre, correo de la cuenta, fecha, importe y código de la operación. También puedes usar el <Link className="font-bold text-brand hover:underline" to="/libro-reclamaciones">Libro de Reclamaciones</Link>.</p>],
      ['Cancelación de tarjeta', <p>Cancelar la renovación evita los siguientes cobros. El acceso continúa hasta finalizar el periodo ya pagado y luego se desactiva.</p>],
      ['Pago con Yape', <p>El pago con Yape activa un mes sin renovación automática. Cuando termine el periodo, el acceso se desactiva y podrás volver a suscribirte cuando lo necesites.</p>],
      ['Derechos del consumidor', <p>Esta política no excluye ni reduce los derechos irrenunciables que correspondan según la legislación peruana.</p>],
    ],
  },
  privacy: {
    title: 'Política de privacidad',
    intro: 'Explicamos qué datos usamos, para qué los necesitamos y cómo puedes ejercer tus derechos.',
    sections: [
      ['Responsable', <p key="controller">El responsable del tratamiento es <strong>{BUSINESS.legalName}</strong>, RUC {BUSINESS.ruc}, con domicilio en {BUSINESS.address}. El canal de privacidad es <a className="font-bold text-brand hover:underline" href={BUSINESS.emailHref}>{BUSINESS.email}</a>.</p>],
      ['Datos que recopilamos', <p>Podemos tratar nombres, correo, teléfono, documento y datos de facturación; categoría de licencia elegida; respuestas, resultados y progreso; datos técnicos básicos de seguridad y navegación; e información enviada en solicitudes o reclamos.</p>],
      ['Finalidades', <p>Usamos los datos para crear y proteger tu cuenta, prestar el servicio, personalizar prácticas, calcular progreso, procesar pagos y comprobantes, enviar comunicaciones necesarias, atender consultas y reclamos, prevenir fraude y cumplir obligaciones legales.</p>],
      ['Proveedores', <p>Podemos encargar operaciones necesarias a Supabase para infraestructura y autenticación, Vercel para alojamiento, Culqi para pagos y Resend para correo. Cada proveedor recibe solo los datos necesarios para cumplir su función y opera bajo sus propias obligaciones de seguridad.</p>],
      ['Conservación y seguridad', <p>Conservamos los datos durante el tiempo necesario para prestar el servicio y cumplir obligaciones tributarias, contractuales y de protección al consumidor. Aplicamos controles técnicos y organizativos razonables, aunque ningún sistema conectado a internet puede ofrecer riesgo cero.</p>],
      ['Tus derechos', <p>Puedes solicitar acceso, rectificación, cancelación u oposición al tratamiento de tus datos escribiendo a <a className="font-bold text-brand hover:underline" href={BUSINESS.emailHref}>{BUSINESS.email}</a>. Incluye información suficiente para verificar tu identidad y atender la solicitud.</p>],
      ['Comunicaciones', <p>Los correos necesarios para verificar la cuenta, recuperar el acceso, confirmar pagos o atender reclamos forman parte del servicio. Las comunicaciones promocionales, si se habilitan, podrán desactivarse.</p>],
    ],
  },
};

function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <p className="font-bold text-brand">Atención al usuario</p>
      <h1 className="mt-2 font-display text-4xl font-black text-ink sm:text-5xl">Contacto</h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">Escríbenos para resolver dudas sobre tu cuenta, suscripción, pagos, comprobantes o el uso del simulador.</p>

      <div className="mt-9 grid gap-0 border-y border-line md:grid-cols-2">
        <div className="py-7 md:pr-8">
          <h2 className="font-display text-2xl font-black text-ink">Datos del proveedor</h2>
          <dl className="mt-5 grid gap-4 text-slate-700">
            <div className="flex gap-3"><Building2 className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" /><div><dt className="font-bold text-ink">Razón social</dt><dd>{BUSINESS.legalName}<br />RUC {BUSINESS.ruc}</dd></div></div>
            <div className="flex gap-3"><MapPin className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" /><div><dt className="font-bold text-ink">Dirección</dt><dd>{BUSINESS.address}</dd></div></div>
          </dl>
        </div>
        <div className="border-t border-line py-7 md:border-l md:border-t-0 md:pl-8">
          <h2 className="font-display text-2xl font-black text-ink">Canales de atención</h2>
          <div className="mt-5 grid gap-4">
            <a className="flex min-h-14 items-center gap-3 rounded-lg border border-line px-4 font-bold text-brand hover:border-brand hover:bg-blue-50" href={BUSINESS.emailHref}><Mail className="h-5 w-5" aria-hidden="true" />{BUSINESS.email}</a>
            <a className="flex min-h-14 items-center gap-3 rounded-lg border border-line px-4 font-bold text-brand hover:border-brand hover:bg-blue-50" href={BUSINESS.phoneHref}><Phone className="h-5 w-5" aria-hidden="true" />{BUSINESS.phone}</a>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-600">Para una queja o reclamo formal utiliza el <Link className="font-bold text-brand hover:underline" to="/libro-reclamaciones">Libro de Reclamaciones</Link>.</p>
        </div>
      </div>
    </div>
  );
}

export default function LegalPage({ page }) {
  const content = pages[page];

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${content?.title || 'Contacto'} | ${BRAND_NAME}`;
    return () => { document.title = previousTitle; };
  }, [content?.title]);

  if (page === 'contact') return <ContactPage />;

  return (
    <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <p className="font-bold text-brand">Información legal</p>
      <h1 className="mt-2 font-display text-4xl font-black leading-tight text-ink sm:text-5xl">{content.title}</h1>
      <p className="mt-4 text-lg leading-8 text-slate-600">{content.intro}</p>
      <p className="mt-3 text-sm font-semibold text-slate-500">Última actualización: 13 de agosto de 2026</p>

      <div className="mt-9 divide-y divide-line border-y border-line">
        {content.sections.map(([title, body]) => (
          <section key={title} className="py-6">
            <h2 className="font-display text-xl font-black text-ink sm:text-2xl">{title}</h2>
            <div className="mt-3 text-base leading-7 text-slate-700">{body}</div>
          </section>
        ))}
      </div>
    </article>
  );
}

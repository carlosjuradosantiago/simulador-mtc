import { Building2, Mail, MapPin, Phone } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BRAND_DISCLAIMER, BRAND_NAME } from '../data/brand.js';
import { FULL_EXAM_IS_FREE } from '../data/examRules.js';
import { BUSINESS, MONTHLY_PLAN } from '../data/legal.js';

const pages = {
  terms: {
    title: 'Términos y condiciones',
    intro: 'Estas condiciones regulan el uso de Simulador MTC, la creación de cuentas y, cuando corresponda, la contratación de servicios digitales.',
    sections: [
      ['1. Proveedor del servicio', <p key="provider">El servicio es ofrecido por <strong>{BUSINESS.legalName}</strong>, RUC {BUSINESS.ruc}, con domicilio en {BUSINESS.address}. Puedes contactarnos en <a className="font-bold text-brand hover:underline" href={BUSINESS.emailHref}>{BUSINESS.email}</a> o al <a className="font-bold text-brand hover:underline" href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>.</p>],
      ['2. Servicio educativo', <><p>{BRAND_NAME} permite practicar preguntas de conocimientos para licencias de conducir por categoría, rendir simulacros cronometrados y revisar resultados y temas por reforzar.</p><p className="mt-3">{BRAND_DISCLAIMER} La plataforma no reemplaza la información oficial ni garantiza la aprobación del examen.</p></>],
      ['3. Aceptación y capacidad', <p>Antes de crear una cuenta ponemos estas condiciones y la <Link className="font-bold text-brand hover:underline" to="/politica-de-privacidad">Política de privacidad</Link> a tu disposición. Al seleccionar “Crear y practicar” o “Crear con Google” confirmas que las leíste y aceptas. Si eres menor de edad, debes utilizar el servicio con autorización y supervisión de tu madre, padre o representante legal.</p>],
      ['4. Información antes de contratar', <p>Crear una cuenta no autoriza ningún cobro. Si se ofrece una contratación, antes de confirmarla mostraremos las funciones incluidas, precio total, duración, medio de pago, condiciones de renovación y forma de cancelación. Solo procesaremos el pago después de una acción y autorización expresa del usuario.</p>],
      ['5. Suscripción mensual, cuando esté disponible', <><p>El plan mensual tiene un precio de <strong>S/ {MONTHLY_PLAN.price}</strong> e incluye durante el periodo contratado las funciones indicadas en la pantalla de compra.</p><p className="mt-3">El pago con tarjeta se renueva únicamente cuando autorizas expresamente el cobro recurrente y puedes cancelar futuras renovaciones. El pago con Yape cubre un mes y no genera renovación automática.</p></>],
      ['6. Pagos y comprobantes', <p>Los pagos son procesados por Culqi. {BRAND_NAME} no recibe ni almacena el número completo ni el código de seguridad de tu tarjeta. Antes de pagar podrás elegir boleta o factura e ingresar los datos necesarios para emitir el comprobante correspondiente.</p>],
      ['7. Cuenta y seguridad', <p>Debes proporcionar información verdadera, mantener tus credenciales seguras y notificarnos si detectas un uso no autorizado. La cuenta es personal. Las acciones realizadas con tus credenciales se atribuyen a tu cuenta, salvo que nos comuniques oportunamente una vulneración o exista responsabilidad legal del proveedor.</p>],
      ['8. Uso permitido', <p>No está permitido copiar o redistribuir masivamente el banco de preguntas, compartir o vender accesos, intentar vulnerar la plataforma, automatizar consultas que afecten el servicio, suplantar a otra persona ni utilizar el contenido con fines ilícitos. Podemos limitar o suspender una cuenta por fraude, riesgo de seguridad, incumplimiento grave o mandato legal, informando el motivo cuando sea posible y sin impedir el ejercicio de tus derechos como consumidor.</p>],
      ['9. Contenido y fuentes oficiales', <p>Revisamos el contenido para mantenerlo útil y actualizado, pero las normas, balotarios y criterios de evaluación pueden cambiar. Debes contrastar requisitos, fechas y reglas con el MTC y otras fuentes oficiales antes de realizar trámites o rendir el examen.</p>],
      ['10. Disponibilidad del servicio', <p>Podemos realizar mantenimiento, correcciones de seguridad y mejoras técnicas. Procuraremos comunicar las interrupciones programadas relevantes. Si una incidencia atribuible al servicio impide usar una función contratada, evaluaremos la corrección, extensión o solución que corresponda según la oferta y la legislación aplicable.</p>],
      ['11. Cambios en las condiciones', <p>Podemos actualizar estas condiciones por cambios legales, comerciales, técnicos o de seguridad. Los cambios materiales se informarán de forma clara antes de que produzcan efectos. No reducirán beneficios ya adquiridos durante un periodo pagado ni se aplicarán retroactivamente en perjuicio del consumidor.</p>],
      ['12. Cancelaciones, devoluciones y reclamos', <p>Las solicitudes económicas se atienden según nuestra <Link className="font-bold text-brand hover:underline" to="/politica-de-cambios-y-devoluciones">Política de cambios y devoluciones</Link>. Puedes contactarnos mediante nuestros <Link className="font-bold text-brand hover:underline" to="/contacto">canales de atención</Link> o presentar una queja o reclamo en el <Link className="font-bold text-brand hover:underline" to="/libro-reclamaciones">Libro de Reclamaciones</Link>. Los reclamos se responden por escrito en un plazo máximo de 15 días hábiles, conforme a la normativa peruana.</p>],
      ['13. Responsabilidad', <p>En la medida permitida por ley, no respondemos por decisiones tomadas exclusivamente con base en material educativo, cambios realizados por autoridades, fallas de equipos o conexión del usuario ni interrupciones inevitables de terceros. Esta regla no excluye nuestra responsabilidad por dolo, culpa, falta de idoneidad, incumplimiento de obligaciones de seguridad o cualquier supuesto que legalmente no pueda limitarse.</p>],
      ['14. Propiedad intelectual', <p>El diseño, software, organización, marca y contenido propio de la plataforma están protegidos por la legislación aplicable. El acceso al servicio concede solo una licencia personal, limitada, no exclusiva e intransferible para estudiar; no transfiere derechos de propiedad intelectual.</p>],
      ['15. Ley aplicable y derechos del consumidor', <p>Estas condiciones se interpretan conforme a las leyes de la República del Perú, incluido el Código de Protección y Defensa del Consumidor. Ninguna disposición limita derechos irrenunciables ni impide acudir al Indecopi o a la autoridad judicial competente.</p>],
    ],
  },
  returns: {
    title: 'Política de cambios y devoluciones',
    intro: 'Esta política explica cómo atendemos incidencias de acceso y, cuando corresponda, solicitudes relacionadas con una contratación.',
    sections: [
      ['Condiciones informadas antes del pago', <p key="purchase-terms">Antes de una contratación mostraremos el servicio, precio total, duración, medio de pago y condiciones de renovación. La información específica mostrada y aceptada en esa operación forma parte de la contratación.</p>],
      ['Incidencias del servicio', <p>Si una función ofrecida no se habilita o presenta una falla relevante, puedes solicitar soporte. Primero intentaremos restablecer el acceso o corregir la incidencia; cuando ello no sea posible, aplicaremos la solución, extensión o devolución que corresponda según la oferta y la ley.</p>],
      ['Casos que revisamos', <><p>Evaluaremos y, cuando corresponda, corregiremos o devolveremos importes por:</p><ul className="mt-3 list-disc space-y-2 pl-6"><li>cobro duplicado o por un importe distinto al aceptado;</li><li>pago confirmado sin activación del servicio adquirido;</li><li>operación no reconocida, sujeta a la validación del medio de pago;</li><li>falta de idoneidad no corregida dentro de un plazo razonable; o</li><li>cualquier supuesto exigido por las normas de protección al consumidor.</li></ul></>],
      ['Casos sin devolución automática', <p>Cuando el acceso digital contratado fue activado correctamente, el cambio de opinión, la falta de uso o el resultado obtenido en un examen no generan por sí solos una devolución. Cada solicitud se evalúa según la oferta, la idoneidad del servicio y los derechos irrenunciables del consumidor.</p>],
      ['Cómo solicitar una revisión', <p>Escríbenos a <a className="font-bold text-brand hover:underline" href={BUSINESS.emailHref}>{BUSINESS.email}</a> indicando tu nombre, correo de la cuenta, fecha, importe y código de la operación. También puedes usar el <Link className="font-bold text-brand hover:underline" to="/libro-reclamaciones">Libro de Reclamaciones</Link>. Confirmaremos la recepción y, cuando la solicitud constituya un reclamo, responderemos por escrito en un plazo máximo de 15 días hábiles.</p>],
      ['Cancelación de renovaciones', <p>Cuando exista una suscripción con tarjeta, cancelar la renovación evita cobros posteriores. El acceso contratado continúa hasta finalizar el periodo ya pagado. Los pagos con Yape no se renuevan automáticamente.</p>],
      ['Forma de devolución', <p>Una devolución aprobada se tramitará, cuando sea posible, al mismo medio de pago utilizado. El plazo de abono puede depender del banco o proveedor de pago; comunicaremos el resultado y la referencia de la operación.</p>],
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
      <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">Escríbenos para resolver dudas sobre tu cuenta{FULL_EXAM_IS_FREE ? ' o el uso del simulador' : ', suscripción, pagos, comprobantes o el uso del simulador'}.</p>

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

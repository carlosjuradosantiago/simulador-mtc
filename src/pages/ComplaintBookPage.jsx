import { BookOpen, CalendarDays, FileText, Info, Mail, MapPin, Phone, RotateCcw, Send, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import Select from '../components/ui/Select.jsx';
import { BRAND_NAME } from '../data/brand.js';
import { BUSINESS, MONTHLY_PLAN } from '../data/legal.js';
import { api } from '../services/api.js';

const today = () => new Date().toISOString().slice(0, 10);

const getInitialForm = () => ({
  documentType: 'DNI',
  firstNames: '',
  lastNames: '',
  document: '',
  email: '',
  phone: '',
  address: '',
  department: '',
  province: '',
  district: '',
  amount: '',
  reference: '',
  incidentDate: today(),
  claimType: 'Reclamo',
  facts: '',
  request: '',
  truthful: false,
  privacy: false,
});

const requiredFields = ['firstNames', 'lastNames', 'document', 'email', 'phone', 'address', 'department', 'province', 'district', 'incidentDate', 'facts', 'request'];

function validate(form) {
  const nextErrors = requiredFields.reduce((errors, field) => {
    if (!String(form[field] || '').trim()) errors[field] = 'Campo obligatorio';
    return errors;
  }, {});

  if (form.email && !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(form.email.trim())) nextErrors.email = 'Ingresa un correo válido';
  if (form.phone && !/^\d{9}$/.test(form.phone.replace(/\D/g, ''))) nextErrors.phone = 'Ingresa un celular de 9 dígitos';
  if (form.documentType === 'DNI' && form.document && !/^\d{8}$/.test(form.document.replace(/\D/g, ''))) nextErrors.document = 'El DNI debe tener 8 dígitos';
  if (form.facts.trim() && form.facts.trim().length < 10) nextErrors.facts = 'Describe lo ocurrido con un poco más de detalle';
  if (form.request.trim() && form.request.trim().length < 5) nextErrors.request = 'Indica qué solución esperas';
  if (form.amount && (!Number.isFinite(Number(form.amount)) || Number(form.amount) < 0)) nextErrors.amount = 'Ingresa un monto válido';
  if (!form.truthful || !form.privacy) nextErrors.checks = 'Marca las dos declaraciones para enviar el formulario.';
  return nextErrors;
}

export default function ComplaintBookPage() {
  const [form, setForm] = useState(getInitialForm);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const resetForm = () => {
    setForm(getInitialForm());
    setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      tipoDocumento: form.documentType,
      numeroDocumento: form.document.replace(/\s/g, ''),
      nombres: form.firstNames.trim(),
      apellidos: form.lastNames.trim(),
      email: form.email.trim().toLowerCase(),
      telefono: form.phone.replace(/\D/g, ''),
      direccion: form.address.trim(),
      departamento: form.department.trim(),
      provincia: form.province.trim(),
      distrito: form.district.trim(),
      tipoBien: 'SERVICIO',
      montoReclamado: form.amount ? Number(form.amount) : null,
      descripcionBien: form.reference.trim()
        ? `${MONTHLY_PLAN.name}. Referencia: ${form.reference.trim()}`
        : MONTHLY_PLAN.name,
      tipoReclamo: form.claimType.toUpperCase(),
      fechaIncidente: form.incidentDate,
      detalleReclamo: form.facts.trim(),
      pedidoConsumidor: form.request.trim(),
      autorizaEnvioCorreo: true,
      aceptaTerminos: form.truthful && form.privacy,
    };

    setSubmitting(true);
    try {
      const response = await api.submitComplaint(payload);
      setSuccess({ number: response.numeroReclamo, deadline: response.fechaLimiteRespuesta });
      resetForm();
    } catch (requestError) {
      setErrors({ submit: requestError.message || 'No pudimos registrar la solicitud. Inténtalo nuevamente.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="max-w-4xl">
        <div className="flex items-center gap-3 text-brand"><BookOpen className="h-8 w-8" aria-hidden="true" /><p className="font-bold">Canal oficial de atención</p></div>
        <h1 className="mt-3 font-display text-3xl font-black leading-tight text-ink sm:text-5xl">Libro de Reclamaciones</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">Registra una queja o reclamo sin iniciar sesión. Te enviaremos una constancia al correo indicado y responderemos en un plazo máximo de 15 días hábiles.</p>
      </header>

      <section className="mt-7 grid gap-3 border-y border-line py-5 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4" aria-label="Datos del proveedor">
        <p><strong className="block text-ink">Proveedor</strong>{BUSINESS.legalName}<br />RUC {BUSINESS.ruc}</p>
        <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" /><span><strong className="block text-ink">Dirección</strong>{BUSINESS.address}</span></p>
        <a className="flex gap-2 font-semibold text-brand hover:underline" href={BUSINESS.phoneHref}><Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span><strong className="block text-ink">Teléfono</strong>{BUSINESS.phone}</span></a>
        <a className="flex gap-2 font-semibold text-brand hover:underline" href={BUSINESS.emailHref}><Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span><strong className="block text-ink">Correo</strong>{BUSINESS.email}</span></a>
      </section>

      <form className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]" onSubmit={handleSubmit} noValidate>
        <div className="grid min-w-0 gap-5">
          <Card className="p-4 shadow-sm sm:p-6">
            <h2 className="font-display text-xl font-black text-ink">1. Tus datos</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Nombres *" value={form.firstNames} error={errors.firstNames} maxLength={80} autoComplete="given-name" onChange={(event) => updateForm('firstNames', event.target.value)} />
              <Input label="Apellidos *" value={form.lastNames} error={errors.lastNames} maxLength={80} autoComplete="family-name" onChange={(event) => updateForm('lastNames', event.target.value)} />
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <Select label="Documento" value={form.documentType} onChange={(event) => updateForm('documentType', event.target.value)}>
                  <option value="DNI">DNI</option><option value="CE">CE</option><option value="PASAPORTE">Pasaporte</option>
                </Select>
                <Input label="Número *" value={form.document} error={errors.document} maxLength={15} inputMode={form.documentType === 'DNI' ? 'numeric' : 'text'} onChange={(event) => updateForm('document', event.target.value)} />
              </div>
              <Input label="Correo electrónico *" type="email" value={form.email} error={errors.email} maxLength={160} autoComplete="email" onChange={(event) => updateForm('email', event.target.value)} />
              <Input label="Celular *" value={form.phone} error={errors.phone} maxLength={12} inputMode="tel" autoComplete="tel" onChange={(event) => updateForm('phone', event.target.value)} />
              <Input label="Dirección *" value={form.address} error={errors.address} maxLength={180} autoComplete="street-address" onChange={(event) => updateForm('address', event.target.value)} />
              <Input label="Departamento *" value={form.department} error={errors.department} maxLength={80} autoComplete="address-level1" onChange={(event) => updateForm('department', event.target.value)} />
              <Input label="Provincia *" value={form.province} error={errors.province} maxLength={80} autoComplete="address-level2" onChange={(event) => updateForm('province', event.target.value)} />
              <Input label="Distrito *" value={form.district} error={errors.district} maxLength={80} onChange={(event) => updateForm('district', event.target.value)} />
            </div>
          </Card>

          <Card className="p-4 shadow-sm sm:p-6">
            <h2 className="font-display text-xl font-black text-ink">2. Servicio contratado</h2>
            <div className="mt-5 border-l-4 border-brand bg-blue-50 px-4 py-3">
              <p className="font-black text-ink">{MONTHLY_PLAN.name}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">Prácticas, simulacros cronometrados, resultados y análisis de progreso.</p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Input label="Monto relacionado (opcional)" type="number" min="0" step="0.01" placeholder="12.00" value={form.amount} error={errors.amount} inputMode="decimal" onChange={(event) => updateForm('amount', event.target.value)} />
              <Input label="Operación o suscripción (opcional)" value={form.reference} maxLength={80} onChange={(event) => updateForm('reference', event.target.value)} />
              <Input label="Fecha del hecho *" type="date" max={today()} value={form.incidentDate} error={errors.incidentDate} onChange={(event) => updateForm('incidentDate', event.target.value)} />
            </div>
          </Card>

          <Card className="p-4 shadow-sm sm:p-6">
            <h2 className="font-display text-xl font-black text-ink">3. Cuéntanos lo ocurrido</h2>
            <fieldset className="mt-5">
              <legend className="text-sm font-bold text-ink">Tipo de solicitud *</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {['Reclamo', 'Queja'].map((item) => (
                  <label key={item} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 font-bold ${form.claimType === item ? 'border-brand bg-blue-50 text-brand' : 'border-line text-slate-700'}`}>
                    <input type="radio" name="claimType" checked={form.claimType === item} onChange={() => updateForm('claimType', item)} className="h-5 w-5 accent-blue-600" />{item}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-5 grid gap-5">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Describe lo ocurrido *
                <textarea className={`min-h-32 rounded-lg border bg-white p-4 text-base outline-none focus:border-brand focus:ring-4 focus:ring-blue-100 ${errors.facts ? 'border-danger' : 'border-line'}`} maxLength={2000} value={form.facts} onChange={(event) => updateForm('facts', event.target.value)} />
                {errors.facts ? <span className="text-xs font-medium text-danger">{errors.facts}</span> : null}
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                ¿Qué solución solicitas? *
                <textarea className={`min-h-28 rounded-lg border bg-white p-4 text-base outline-none focus:border-brand focus:ring-4 focus:ring-blue-100 ${errors.request ? 'border-danger' : 'border-line'}`} maxLength={1000} value={form.request} onChange={(event) => updateForm('request', event.target.value)} />
                {errors.request ? <span className="text-xs font-medium text-danger">{errors.request}</span> : null}
              </label>
            </div>

            <div className="mt-6 grid gap-3 text-sm leading-6 text-slate-700">
              <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={form.truthful} onChange={(event) => updateForm('truthful', event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-blue-600" /><span>Declaro que la información proporcionada es verdadera.</span></label>
              <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={form.privacy} onChange={(event) => updateForm('privacy', event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-blue-600" /><span>He leído la <Link className="font-bold text-brand hover:underline" to="/politica-de-privacidad">Política de privacidad</Link> y autorizo el uso de mis datos para atender esta solicitud.</span></label>
              {errors.checks ? <p className="font-bold text-danger" role="alert">{errors.checks}</p> : null}
            </div>

            {errors.submit ? <p className="mt-5 border-l-4 border-danger bg-red-50 px-4 py-3 font-bold text-danger" role="alert">{errors.submit}</p> : null}
            <div className="mt-6 grid gap-3 sm:flex sm:justify-end">
              <Button type="button" variant="secondary" onClick={resetForm}><RotateCcw className="h-4 w-4" aria-hidden="true" />Limpiar</Button>
              <Button type="submit" disabled={submitting}><Send className="h-4 w-4" aria-hidden="true" />{submitting ? 'Enviando...' : 'Enviar solicitud'}</Button>
            </div>
          </Card>
        </div>

        <aside className="grid content-start gap-4" aria-label="Información sobre reclamos">
          <Card className="p-5 shadow-sm">
            <h2 className="flex items-center gap-3 font-display text-xl font-black text-ink"><CalendarDays className="h-7 w-7 text-brand" aria-hidden="true" />Plazo de atención</h2>
            <p className="mt-3 leading-7 text-slate-600">Responderemos tu queja o reclamo en un plazo máximo e improrrogable de <strong className="text-ink">15 días hábiles</strong>.</p>
          </Card>
          <Card className="p-5 shadow-sm">
            <h2 className="flex items-center gap-3 font-display text-xl font-black text-ink"><Info className="h-7 w-7 text-brand" aria-hidden="true" />Diferencia rápida</h2>
            <p className="mt-3 leading-7 text-slate-600"><strong className="text-ink">Reclamo:</strong> disconformidad con el servicio, acceso o cobro.</p>
            <p className="mt-3 leading-7 text-slate-600"><strong className="text-ink">Queja:</strong> disconformidad con la atención recibida.</p>
          </Card>
          <Card className="p-5 shadow-sm">
            <h2 className="flex items-center gap-3 font-display text-xl font-black text-ink"><ShieldCheck className="h-7 w-7 text-success" aria-hidden="true" />Ten en cuenta</h2>
            <ul className="mt-3 grid gap-3 leading-6 text-slate-600">
              <li>No necesitas una cuenta para registrar tu solicitud.</li>
              <li>No es obligatorio contar con un comprobante de pago.</li>
              <li>Recibirás la constancia en el correo que indiques.</li>
            </ul>
          </Card>
          <p className="px-1 text-xs leading-5 text-slate-500"><FileText className="mr-1 inline h-4 w-4" aria-hidden="true" />La presentación de una queja o reclamo no impide acudir a otras vías de solución de controversias.</p>
        </aside>
      </form>

      <Modal open={Boolean(success)} title="Solicitud registrada" onClose={() => setSuccess(null)}>
        <div className="grid gap-3 leading-7">
          <p>Tu constancia es <strong className="text-brand">{success?.number}</strong>. También la enviamos al correo registrado.</p>
          {success?.deadline ? <p>Fecha máxima de respuesta: <strong>{new Date(success.deadline).toLocaleDateString('es-PE')}</strong>.</p> : null}
        </div>
      </Modal>
    </div>
  );
}

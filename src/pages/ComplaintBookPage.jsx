import { BookOpen, Box, CalendarDays, FileText, Info, Minus, RotateCcw, Send, Settings, Shield, Upload } from 'lucide-react';
import { useState } from 'react';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import Select from '../components/ui/Select.jsx';
import { BRAND_NAME } from '../data/brand.js';
import { api } from '../services/api.js';

const initialForm = {
  name: '',
  document: '',
  email: '',
  phone: '',
  address: '',
  department: '',
  province: '',
  district: '',
  goodType: 'Producto',
  amount: '',
  order: '',
  claimType: 'Reclamo',
  facts: '',
  request: '',
  truthful: true,
  dataUse: true,
};

const requiredFields = ['name', 'document', 'email', 'phone', 'address', 'department', 'province', 'district', 'amount', 'facts', 'request'];

export default function ComplaintBookPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [successOpen, setSuccessOpen] = useState(false);
  const [claimNumber, setClaimNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateForm = (field, value) => setForm((currentForm) => ({ ...currentForm, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = requiredFields.reduce((accumulator, field) => {
      if (!form[field]) {
        accumulator[field] = 'Campo obligatorio';
      }
      return accumulator;
    }, {});

    if (!form.truthful || !form.dataUse) {
      nextErrors.checks = 'Debes aceptar las declaraciones obligatorias.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      const [firstName, ...lastNameParts] = form.name.trim().split(/\s+/);
      const payload = {
        tipoDocumento: 'DNI',
        numeroDocumento: form.document,
        nombres: firstName,
        apellidos: lastNameParts.join(' ') || 'No indicado',
        email: form.email,
        telefono: form.phone,
        direccion: form.address,
        departamento: form.department,
        provincia: form.province,
        distrito: form.district,
        tipoBien: form.goodType.toUpperCase(),
        montoReclamado: Number(String(form.amount).replace(/[^0-9.]/g, '')) || null,
        descripcionBien: form.order || `Servicio ${BRAND_NAME}`,
        tipoReclamo: form.claimType.toUpperCase(),
        fechaIncidente: new Date().toISOString().slice(0, 10),
        detalleReclamo: form.facts,
        pedidoConsumidor: form.request,
        autorizaEnvioCorreo: form.dataUse,
        aceptaTerminos: form.truthful && form.dataUse,
      };

      setSubmitting(true);
      try {
        const response = await api.submitComplaint(payload);
        setClaimNumber(response.numeroReclamo);
        setSuccessOpen(true);
      } catch (requestError) {
        setErrors({ submit: requestError.message });
      } finally {
        setSubmitting(false);
      }
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setAttachments([]);
    setErrors({});
  };

  return (
    <div className="grid gap-5 pt-3">
      <div className="flex items-start gap-5">
        <span className="grid h-16 w-16 place-items-center rounded-xl bg-blue-50 text-brand"><FileText className="h-8 w-8" /></span>
        <div>
          <h1 className="text-4xl font-black">Libro de Reclamaciones</h1>
          <p className="mt-2 max-w-5xl text-slate-600">En {BRAND_NAME} valoramos tu experiencia. Registra aquí tu queja o reclamo y nuestro equipo te dará respuesta dentro de los plazos establecidos por la normativa vigente en el Perú (Ley N° 29571 y su Reglamento).</p>
        </div>
      </div>

      <form className="grid gap-4 xl:grid-cols-[1fr_392px]" onSubmit={handleSubmit}>
        <div className="grid gap-3">
          <Card className="p-5 shadow-sm">
            <h2 className="mb-5 flex items-center gap-3 text-lg font-black"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-sm text-white">1</span> Datos del consumidor</h2>
            <div className="grid gap-4 md:grid-cols-4">
              <Input label="Nombres y apellidos *" placeholder="Ingresa tus nombres y apellidos" value={form.name} error={errors.name} onChange={(event) => updateForm('name', event.target.value)} />
              <Input label="DNI / CE *" placeholder="Ej. 12345678" value={form.document} error={errors.document} onChange={(event) => updateForm('document', event.target.value)} />
              <Input label="Correo electrónico *" placeholder="correo@ejemplo.com" value={form.email} error={errors.email} onChange={(event) => updateForm('email', event.target.value)} />
              <Input label="Teléfono *" placeholder="Ej. 912 345 678" value={form.phone} error={errors.phone} onChange={(event) => updateForm('phone', event.target.value)} />
              <Input label="Dirección *" className="md:col-span-2" placeholder="Ingresa tu dirección completa" value={form.address} error={errors.address} onChange={(event) => updateForm('address', event.target.value)} />
              <Select label="Departamento *" value={form.department} error={errors.department} onChange={(event) => updateForm('department', event.target.value)}><option value="">Selecciona</option><option>Lima</option><option>Arequipa</option><option>La Libertad</option></Select>
              <Select label="Provincia *" value={form.province} error={errors.province} onChange={(event) => updateForm('province', event.target.value)}><option value="">Selecciona</option><option>Lima</option><option>Callao</option><option>Trujillo</option></Select>
              <Select label="Distrito *" value={form.district} error={errors.district} onChange={(event) => updateForm('district', event.target.value)}><option value="">Selecciona</option><option>Miraflores</option><option>San Isidro</option><option>Surco</option></Select>
            </div>
          </Card>

          <Card className="p-5 shadow-sm">
            <h2 className="mb-5 flex items-center gap-3 text-lg font-black"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-sm text-white">2</span> Información del bien contratado</h2>
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.4fr]">
              <div>
                <p className="mb-2 text-sm font-semibold">Bien contratado *</p>
                <div className="grid grid-cols-2 gap-3">
                  {['Producto', 'Servicio'].map((item) => (
                    <button key={item} type="button" onClick={() => updateForm('goodType', item)} className={`flex h-14 items-center justify-between rounded-xl border px-4 text-sm font-bold ${form.goodType === item ? 'border-brand bg-blue-50 text-brand ring-2 ring-blue-100' : 'border-line text-slate-600'}`}>
                      <span className="inline-flex items-center gap-3">{item === 'Producto' ? <Box className="h-6 w-6" /> : <Settings className="h-6 w-6" />} {item}</span>
                      <span className={`h-4 w-4 rounded-full border ${form.goodType === item ? 'border-brand bg-brand' : 'border-line'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Monto reclamado *" placeholder="S/ 0.00" value={form.amount} error={errors.amount} onChange={(event) => updateForm('amount', event.target.value)} />
              <Input label="N° pedido o suscripción (opcional)" placeholder="Ej. #PED12345 o SUSC-001" value={form.order} onChange={(event) => updateForm('order', event.target.value)} />
            </div>
          </Card>

          <Card className="p-5 shadow-sm">
            <h2 className="mb-5 flex items-center gap-3 text-lg font-black"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-sm text-white">3</span> Detalle de la reclamación</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-semibold">Tipo *</p>
                <div className="flex gap-5 text-sm font-semibold">
                  {['Queja', 'Reclamo'].map((item) => <label key={item} className="flex items-center gap-2"><input type="radio" checked={form.claimType === item} onChange={() => updateForm('claimType', item)} className="accent-blue-600" /> {item}</label>)}
                </div>
              </div>
              <label className="grid gap-2 text-sm font-semibold md:col-span-2">
                Relata los hechos *
                <textarea className="min-h-20 rounded-lg border border-line p-4 outline-none focus:border-brand focus:ring-4 focus:ring-blue-100" placeholder="Describe de manera clara y detallada lo sucedido." value={form.facts} onChange={(event) => updateForm('facts', event.target.value)} />
                {errors.facts ? <span className="text-xs text-danger">{errors.facts}</span> : null}
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Qué solicita el consumidor *
                <textarea className="min-h-20 rounded-lg border border-line p-4 outline-none focus:border-brand focus:ring-4 focus:ring-blue-100" placeholder={`Explica qué solución o respuesta esperas de ${BRAND_NAME}.`} value={form.request} onChange={(event) => updateForm('request', event.target.value)} />
                {errors.request ? <span className="text-xs text-danger">{errors.request}</span> : null}
              </label>
              <label className="grid min-h-20 cursor-pointer place-items-center rounded-xl border border-dashed border-blue-200 bg-blue-50 p-5 text-center text-sm text-brand hover:border-brand">
                <Upload className="mb-2 h-8 w-8" />
                {attachments.length ? `${attachments.length} archivo(s) seleccionado(s)` : 'Arrastra tus archivos aquí o haz clic para seleccionar'}<br /><span className="text-xs text-slate-500">Formatos permitidos: JPG, PNG, PDF (Máx. 5 MB por archivo)</span>
                <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf" className="sr-only" onChange={(event) => setAttachments(Array.from(event.target.files ?? []))} />
              </label>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-slate-700">
              <label className="flex items-start gap-3"><input type="checkbox" checked={form.truthful} onChange={(event) => updateForm('truthful', event.target.checked)} className="mt-1 accent-blue-600" /> Declaro que la información proporcionada es verdadera y corresponde a mi experiencia como consumidor.</label>
              <label className="flex items-start gap-3"><input type="checkbox" checked={form.dataUse} onChange={(event) => updateForm('dataUse', event.target.checked)} className="mt-1 accent-blue-600" /> Autorizo a {BRAND_NAME} a utilizar mis datos para la atención y respuesta de mi queja o reclamo.</label>
              {errors.checks ? <p className="font-semibold text-danger">{errors.checks}</p> : null}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="secondary" onClick={resetForm}><RotateCcw className="h-4 w-4" /> Limpiar formulario</Button>
              <Button type="submit" disabled={submitting}><Send className="h-4 w-4" /> {submitting ? 'Enviando...' : 'Enviar reclamo'}</Button>
            </div>
            {errors.submit ? <p className="mt-3 font-semibold text-danger">{errors.submit}</p> : null}
          </Card>
        </div>

        <aside className="grid gap-3 self-start">
          <Card className="p-5 shadow-sm"><h2 className="flex items-center gap-3 text-lg font-black"><BookOpen className="h-10 w-10 rounded-full bg-blue-50 p-2 text-brand" /> ¿Qué es el Libro de Reclamaciones?</h2><p className="mt-3 text-sm leading-6 text-slate-600">Es un canal oficial para que los consumidores puedan presentar quejas o reclamos cuando consideren que sus derechos han sido afectados.</p><p className="mt-3 text-sm leading-6 text-slate-600">Tu comunicación será atendida conforme a la normativa de protección al consumidor del Perú.</p></Card>
          <Card className="bg-blue-50 p-5 ring-1 ring-blue-100 shadow-sm"><h2 className="flex items-center gap-3 text-lg font-black text-brand"><Minus className="h-10 w-10 rounded-full bg-brand p-2 text-white" /> Queja</h2><p className="mt-3 text-sm leading-6 text-slate-600">Expresión de disconformidad no relacionada a obligaciones de dar, hacer o no hacer.</p><p className="mt-2 text-sm leading-6 text-slate-600">Ejemplos: trato inadecuado, demoras injustificadas en la atención, instalaciones inadecuadas, entre otros.</p></Card>
          <Card className="bg-emerald-50 p-5 ring-1 ring-emerald-100 shadow-sm"><h2 className="flex items-center gap-3 text-lg font-black text-success"><FileText className="h-10 w-10 rounded-full bg-emerald-100 p-2 text-success" /> Reclamo</h2><p className="mt-3 text-sm leading-6 text-slate-600">Disconformidad relacionada al incumplimiento de obligaciones en la prestación del producto o servicio.</p><p className="mt-2 text-sm leading-6 text-slate-600">Ejemplos: producto defectuoso, servicio no brindado, cobros indebidos, entre otros.</p></Card>
          <Card className="p-5 shadow-sm"><h2 className="flex items-center gap-3 text-lg font-black"><Info className="h-6 w-6 text-brand" /> Información importante</h2><div className="mt-4 grid gap-3 text-sm text-slate-600"><p className="flex gap-2"><CalendarDays className="h-5 w-5 text-brand" /> Recibirás una respuesta en un plazo máximo de 15 días hábiles.</p><p className="flex gap-2"><CalendarDays className="h-5 w-5 text-brand" /> En caso de reclamo, la empresa puede ampliar el plazo hasta 30 días hábiles.</p><p className="flex gap-2"><FileText className="h-5 w-5 text-brand" /> Tu comunicación será considerada incluso sin contar con comprobante de pago.</p><p className="flex gap-2"><Shield className="h-5 w-5 text-brand" /> Tus datos personales están protegidos y serán usados solo para la atención de tu caso.</p></div></Card>
        </aside>
      </form>

      <footer className="flex flex-wrap justify-between gap-4 py-3 text-sm text-slate-500">
        <p>© 2025 {BRAND_NAME}. Todos los derechos reservados.</p>
        <p>Cumplimos con la Ley N° 29571 y el Código de Protección y Defensa del Consumidor.</p>
      </footer>

      <Modal open={successOpen} title="Tu reclamo fue registrado correctamente." onClose={() => setSuccessOpen(false)}>
        Recibimos tu solicitud y generamos la constancia {claimNumber}. Puedes usar ese número para consultar el estado del reclamo.
      </Modal>
    </div>
  );
}

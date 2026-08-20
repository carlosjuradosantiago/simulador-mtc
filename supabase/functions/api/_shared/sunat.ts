import { DOMParser } from 'npm:@xmldom/xmldom@0.8.11';
import { zipSync, unzipSync, strFromU8, strToU8 } from 'npm:fflate@0.8.2';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import { SignedXml } from 'npm:xml-crypto@6.1.2';

const SUNAT_BETA_URL = 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService';
const XMLDSIG_NS = 'http://www.w3.org/2000/09/xmldsig#';

type ReceiptRow = {
  id: number;
  id_usuario: number;
  id_transaccion: number;
  tipo_comprobante: 'BOLETA' | 'FACTURA';
  serie: string;
  numero: number;
  ambiente_sunat: 'beta' | 'production';
  ruc_emisor: string;
  razon_social_emisor: string;
  tipo_documento_cliente: string;
  numero_documento_cliente: string;
  nombre_cliente: string;
  direccion_cliente?: string | null;
  correo_cliente: string;
  moneda: string;
  subtotal: number | string;
  igv: number | string;
  total: number | string;
};

type SunatConfig = {
  environment: 'beta' | 'production';
  endpoint: string;
  username: string;
  password: string;
  privateKey: string;
  certificate: string;
};

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} no esta configurado`);
  return value;
}

function getSunatConfig(): SunatConfig {
  const environment = (Deno.env.get('SUNAT_ENV') || 'beta').toLowerCase();
  if (environment !== 'beta') {
    throw new Error('La emision SUNAT de esta version esta limitada al ambiente beta');
  }

  const ruc = requiredEnv('SUNAT_RUC');

  return {
    environment: 'beta',
    endpoint: SUNAT_BETA_URL,
    // SUNAT beta publishes MODDATOS as the shared credential for structure tests.
    username: `${ruc}MODDATOS`,
    password: 'MODDATOS',
    privateKey: requiredEnv('SUNAT_PRIVATE_KEY_PEM').replace(/\\n/g, '\n'),
    certificate: requiredEnv('SUNAT_CERTIFICATE_PEM').replace(/\\n/g, '\n'),
  };
}

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function peruDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function peruTime(value = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(value);
}

function amountInWords(value: number) {
  const units = ['CERO', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const tens = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const integer = Math.max(0, Math.floor(value));
  let words = '';

  if (integer < 10) words = units[integer];
  else if (integer < 20) words = teens[integer - 10];
  else if (integer < 100) {
    const ten = Math.floor(integer / 10);
    const unit = integer % 10;
    words = unit ? `${tens[ten]} Y ${units[unit]}` : tens[ten];
  } else {
    words = String(integer);
  }

  const cents = Math.round((value - integer) * 100);
  return `SON ${words} CON ${String(cents).padStart(2, '0')}/100 SOLES`;
}

function signatureBlock(receipt: ReceiptRow) {
  const documentId = `${receipt.serie}-${receipt.numero}`;
  return `
  <cac:Signature>
    <cbc:ID>${escapeXml(`SIG-${documentId}`)}</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification><cbc:ID>${escapeXml(receipt.ruc_emisor)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${escapeXml(receipt.razon_social_emisor)}</cbc:Name></cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference><cbc:URI>${escapeXml(`#SIG-${documentId}`)}</cbc:URI></cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>`;
}

function supplierBlock(receipt: ReceiptRow) {
  return `
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${escapeXml(receipt.ruc_emisor)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${escapeXml(receipt.razon_social_emisor)}</cbc:Name></cac:PartyName>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(receipt.razon_social_emisor)}</cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:ID schemeName="Ubigeos" schemeAgencyName="PE:INEI">150101</cbc:ID>
          <cbc:AddressTypeCode listAgencyName="PE:SUNAT" listName="Establecimientos anexos">0000</cbc:AddressTypeCode>
          <cbc:CityName>LIMA</cbc:CityName>
          <cbc:CountrySubentity>LIMA</cbc:CountrySubentity>
          <cbc:District>LIMA</cbc:District>
          <cac:AddressLine><cbc:Line>LIMA - LIMA - LIMA</cbc:Line></cac:AddressLine>
          <cac:Country><cbc:IdentificationCode listID="ISO 3166-1" listAgencyName="United Nations Economic Commission for Europe" listName="Country">PE</cbc:IdentificationCode></cac:Country>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>`;
}

function customerBlock(receipt: ReceiptRow) {
  return `
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${escapeXml(receipt.tipo_documento_cliente)}" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${escapeXml(receipt.numero_documento_cliente)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(receipt.nombre_cliente)}</cbc:RegistrationName>
        ${receipt.direccion_cliente ? `<cac:RegistrationAddress><cac:AddressLine><cbc:Line>${escapeXml(receipt.direccion_cliente)}</cbc:Line></cac:AddressLine><cac:Country><cbc:IdentificationCode>PE</cbc:IdentificationCode></cac:Country></cac:RegistrationAddress>` : ''}
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>`;
}

function buildInvoiceXml(receipt: ReceiptRow) {
  const issueDate = peruDate();
  const documentType = receipt.tipo_comprobante === 'FACTURA' ? '01' : '03';
  const documentId = `${receipt.serie}-${receipt.numero}`;
  const subtotal = money(receipt.subtotal);
  const igv = money(receipt.igv);
  const total = money(receipt.total);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent/></ext:UBLExtension></ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID schemeAgencyName="PE:SUNAT">2.0</cbc:CustomizationID>
  <cbc:ProfileID schemeName="SUNAT:Identificador de Tipo de Operación" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo17">0101</cbc:ProfileID>
  <cbc:ID>${escapeXml(documentId)}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${peruTime()}</cbc:IssueTime>
  <cbc:DueDate>${issueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode listID="0101" listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01">${documentType}</cbc:InvoiceTypeCode>
  <cbc:Note languageLocaleID="1000">${escapeXml(amountInWords(Number(receipt.total)))}</cbc:Note>
  <cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listName="Currency" listAgencyName="United Nations Economic Commission for Europe">PEN</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>1</cbc:LineCountNumeric>
  ${signatureBlock(receipt)}
  ${supplierBlock(receipt)}
  ${customerBlock(receipt)}
  <cac:PaymentTerms>
    <cbc:ID>FormaPago</cbc:ID>
    <cbc:PaymentMeansID>Contado</cbc:PaymentMeansID>
  </cac:PaymentTerms>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="PEN">${igv}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="PEN">${subtotal}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="PEN">${igv}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID schemeID="UN/ECE 5305" schemeName="Tax Category Identifier" schemeAgencyName="United Nations Economic Commission for Europe">S</cbc:ID>
        <cac:TaxScheme><cbc:ID schemeID="UN/ECE 5153" schemeName="Codigo de tributos" schemeAgencyName="PE:SUNAT">1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="PEN">${subtotal}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="PEN">${total}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="PEN">${total}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="NIU" unitCodeListID="UN/ECE rec 20" unitCodeListAgencyName="United Nations Economic Commission for Europe">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="PEN">${subtotal}</cbc:LineExtensionAmount>
    <cac:PricingReference><cac:AlternativeConditionPrice><cbc:PriceAmount currencyID="PEN">${total}</cbc:PriceAmount><cbc:PriceTypeCode listName="Tipo de Precio" listAgencyName="PE:SUNAT" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16">01</cbc:PriceTypeCode></cac:AlternativeConditionPrice></cac:PricingReference>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="PEN">${igv}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="PEN">${subtotal}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="PEN">${igv}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:ID schemeID="UN/ECE 5305" schemeName="Tax Category Identifier" schemeAgencyName="United Nations Economic Commission for Europe">S</cbc:ID>
          <cbc:Percent>18.00</cbc:Percent>
          <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">10</cbc:TaxExemptionReasonCode>
          <cac:TaxScheme><cbc:ID schemeID="UN/ECE 5153" schemeName="Codigo de tributos" schemeAgencyName="PE:SUNAT">1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item><cbc:Description>Acceso mensual al Simulador MTC</cbc:Description><cac:SellersItemIdentification><cbc:ID>PLAN-PREMIUM</cbc:ID></cac:SellersItemIdentification></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="PEN">${subtotal}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
</Invoice>`;
}

function summaryIdentifier(summarySequence: number) {
  const numericSequence = Math.max(1, Math.abs(Math.trunc(Number(summarySequence))) || 1);
  // ponytail: five digits cover 99,999 daily sends; use a persisted daily counter before exceeding that ceiling.
  const sequence = String(((numericSequence - 1) % 99999) + 1).padStart(5, '0');
  return `RC-${peruDate().replaceAll('-', '')}-${sequence}`;
}

function buildSummaryXml(receipt: ReceiptRow, summarySequence: number) {
  const referenceDate = peruDate();
  const identifier = summaryIdentifier(summarySequence);
  const subtotal = money(receipt.subtotal);
  const igv = money(receipt.igv);
  const total = money(receipt.total);

  return `<?xml version="1.0" encoding="UTF-8"?>
<SummaryDocuments xmlns="urn:sunat:names:specification:ubl:peru:schema:xsd:SummaryDocuments-1"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
  xmlns:sac="urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1">
  <ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent/></ext:UBLExtension></ext:UBLExtensions>
  <cbc:UBLVersionID>2.0</cbc:UBLVersionID>
  <cbc:CustomizationID>1.1</cbc:CustomizationID>
  <cbc:ID>${identifier}</cbc:ID>
  <cbc:ReferenceDate>${referenceDate}</cbc:ReferenceDate>
  <cbc:IssueDate>${referenceDate}</cbc:IssueDate>
  ${signatureBlock(receipt)}
  <cac:AccountingSupplierParty><cbc:CustomerAssignedAccountID schemeID="6">${escapeXml(receipt.ruc_emisor)}</cbc:CustomerAssignedAccountID><cbc:AdditionalAccountID>6</cbc:AdditionalAccountID><cac:Party><cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(receipt.razon_social_emisor)}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>
  <sac:SummaryDocumentsLine>
    <cbc:LineID>1</cbc:LineID>
    <cbc:DocumentTypeCode>03</cbc:DocumentTypeCode>
    <cbc:ID>${escapeXml(receipt.serie)}-${receipt.numero}</cbc:ID>
    <cac:AccountingCustomerParty>
      <cbc:CustomerAssignedAccountID>${escapeXml(receipt.numero_documento_cliente)}</cbc:CustomerAssignedAccountID>
      <cbc:AdditionalAccountID>${escapeXml(receipt.tipo_documento_cliente)}</cbc:AdditionalAccountID>
    </cac:AccountingCustomerParty>
    <cac:Status><cbc:ConditionCode>1</cbc:ConditionCode></cac:Status>
    <sac:TotalAmount currencyID="PEN">${total}</sac:TotalAmount>
    <sac:BillingPayment><cbc:PaidAmount currencyID="PEN">${subtotal}</cbc:PaidAmount><cbc:InstructionID>01</cbc:InstructionID></sac:BillingPayment>
    <cac:TaxTotal><cbc:TaxAmount currencyID="PEN">${igv}</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxAmount currencyID="PEN">${igv}</cbc:TaxAmount><cac:TaxCategory><cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
  </sac:SummaryDocumentsLine>
</SummaryDocuments>`;
}

function signXml(xml: string, config: SunatConfig) {
  const certificateBody = config.certificate
    .replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----/g, '')
    .replace(/\s/g, '');
  const signer = new SignedXml({
    privateKey: config.privateKey,
    publicCert: config.certificate,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    getKeyInfoContent: () => `<ds:X509Data><ds:X509Certificate>${certificateBody}</ds:X509Certificate></ds:X509Data>`,
  });

  signer.addReference({
    xpath: '/*',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    isEmptyUri: true,
  });

  signer.computeSignature(xml, {
    prefix: 'ds',
    location: {
      reference: "//*[local-name(.)='ExtensionContent']",
      action: 'append',
    },
  });

  return signer.getSignedXml();
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function textByLocalName(xml: string, name: string) {
  const document = new DOMParser().parseFromString(xml, 'text/xml');
  if (!document) return '';
  const elements = document.getElementsByTagName('*');
  for (let index = 0; index < elements.length; index += 1) {
    if (elements[index].localName === name) return elements[index].textContent?.trim() || '';
  }
  return '';
}

function soapEnvelope(config: SunatConfig, method: string, body: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header><wsse:Security><wsse:UsernameToken><wsse:Username>${escapeXml(config.username)}</wsse:Username><wsse:Password>${escapeXml(config.password)}</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header>
  <soapenv:Body><ser:${method}>${body}</ser:${method}></soapenv:Body>
</soapenv:Envelope>`;
}

async function callSunat(config: SunatConfig, method: string, body: string) {
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: '',
    },
    body: soapEnvelope(config, method, body),
  });
  const text = await response.text();
  const fault = textByLocalName(text, 'faultstring');
  if (!response.ok || fault) {
    throw new Error(fault || `SUNAT respondio HTTP ${response.status}`);
  }
  return text;
}

async function sendBill(config: SunatConfig, fileName: string, zip: Uint8Array) {
  const response = await callSunat(
    config,
    'sendBill',
    `<fileName>${escapeXml(fileName)}</fileName><contentFile>${bytesToBase64(zip)}</contentFile>`,
  );
  const cdrBase64 = textByLocalName(response, 'applicationResponse') || textByLocalName(response, 'return');
  if (!cdrBase64) throw new Error('SUNAT no devolvio una constancia de recepcion');
  return base64ToBytes(cdrBase64);
}

async function sendSummary(config: SunatConfig, fileName: string, zip: Uint8Array) {
  const response = await callSunat(
    config,
    'sendSummary',
    `<fileName>${escapeXml(fileName)}</fileName><contentFile>${bytesToBase64(zip)}</contentFile>`,
  );
  const ticket = textByLocalName(response, 'ticket') || textByLocalName(response, 'return');
  if (!ticket) throw new Error('SUNAT no devolvio el ticket del resumen diario');
  return ticket;
}

async function getSummaryStatus(config: SunatConfig, ticket: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await callSunat(config, 'getStatus', `<ticket>${escapeXml(ticket)}</ticket>`);
    const statusCode = textByLocalName(response, 'statusCode');
    if (statusCode === '98') continue;
    if (statusCode !== '0') {
      throw new Error(textByLocalName(response, 'statusMessage') || `SUNAT rechazo el ticket (${statusCode || 'sin codigo'})`);
    }
    const content = textByLocalName(response, 'content');
    if (!content) throw new Error('SUNAT acepto el ticket sin devolver CDR');
    return base64ToBytes(content);
  }
  throw new Error('SUNAT aun esta procesando el resumen diario');
}

function parseCdr(cdrZip: Uint8Array) {
  const files = unzipSync(cdrZip);
  const xmlEntry = Object.entries(files).find(([name]) => name.toLowerCase().endsWith('.xml'));
  if (!xmlEntry) throw new Error('La CDR de SUNAT no contiene XML');
  const xml = strFromU8(xmlEntry[1]);
  const code = textByLocalName(xml, 'ResponseCode');
  const description = textByLocalName(xml, 'Description');
  const note = textByLocalName(xml, 'Note');
  return {
    code,
    description: [description, note].filter(Boolean).join(' - '),
    accepted: code === '0',
  };
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', strToU8(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function buildReceiptPdf(receipt: ReceiptRow, digest: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const documentId = `${receipt.serie}-${receipt.numero}`;
  const lines = [
    ['Emisor', receipt.razon_social_emisor],
    ['RUC', receipt.ruc_emisor],
    ['Documento', `${receipt.tipo_comprobante} ${documentId}`],
    ['Fecha', peruDate()],
    ['Cliente', receipt.nombre_cliente],
    ['Documento cliente', `${receipt.tipo_documento_cliente} - ${receipt.numero_documento_cliente}`],
    ['Concepto', 'Acceso mensual al Simulador MTC'],
    ['Subtotal', `S/ ${money(receipt.subtotal)}`],
    ['IGV (18%)', `S/ ${money(receipt.igv)}`],
    ['TOTAL', `S/ ${money(receipt.total)}`],
  ];

  page.drawText('SIMULADOR MTC', { x: 48, y: 785, size: 18, font: bold, color: rgb(0.04, 0.16, 0.35) });
  page.drawText(`${receipt.tipo_comprobante} ELECTRONICA`, { x: 330, y: 785, size: 14, font: bold });
  page.drawText(documentId, { x: 410, y: 760, size: 12, font: bold });
  let y = 675;
  for (const [label, value] of lines) {
    page.drawText(`${label}:`, { x: 58, y, size: 11, font: bold, color: rgb(0.25, 0.31, 0.4) });
    page.drawText(String(value), { x: 190, y, size: 11, font: label === 'TOTAL' ? bold : regular });
    y -= 34;
  }

  page.drawText(`Hash: ${digest}`, { x: 58, y: 190, size: 7, font: regular, color: rgb(0.35, 0.4, 0.47) });
  page.drawText('Representacion impresa del comprobante electronico.', { x: 58, y: 165, size: 9, font: regular });
  return new Uint8Array(await pdf.save());
}

async function uploadPrivateFile(supabase: any, path: string, data: Uint8Array | string, contentType: string) {
  const payload = typeof data === 'string' ? strToU8(data) : data;
  const { error } = await supabase.storage.from('tax-documents').upload(path, payload, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`No se pudo guardar ${path}: ${error.message}`);
}

export async function generateAndSendTaxDocument(supabase: any, receipt: ReceiptRow) {
  const config = getSunatConfig();
  const documentId = `${receipt.serie}-${receipt.numero}`;
  const baseName = `${receipt.ruc_emisor}-${receipt.tipo_comprobante === 'FACTURA' ? '01' : '03'}-${documentId}`;
  const folder = `${receipt.id_usuario}/${receipt.id}`;
  const signedXml = signXml(buildInvoiceXml(receipt), config);
  const digest = await sha256Hex(signedXml);
  const pdf = await buildReceiptPdf(receipt, digest);
  const xmlPath = `${folder}/${baseName}.xml`;
  const pdfPath = `${folder}/${baseName}.pdf`;

  await Promise.all([
    uploadPrivateFile(supabase, xmlPath, signedXml, 'application/xml'),
    uploadPrivateFile(supabase, pdfPath, pdf, 'application/pdf'),
  ]);

  let cdr: Uint8Array;
  let ticket: string | null = null;
  let responseBaseName = baseName;

  if (receipt.tipo_comprobante === 'FACTURA') {
    const zipName = `${baseName}.zip`;
    const zip = zipSync({ [`${baseName}.xml`]: strToU8(signedXml) });
    cdr = await sendBill(config, zipName, zip);
  } else {
    const sequence = receipt.id;
    const summaryId = summaryIdentifier(sequence);
    const summaryBaseName = `${receipt.ruc_emisor}-${summaryId}`;
    responseBaseName = summaryBaseName;
    const signedSummary = signXml(buildSummaryXml(receipt, sequence), config);
    const zip = zipSync({ [`${summaryBaseName}.xml`]: strToU8(signedSummary) });
    await uploadPrivateFile(supabase, `${folder}/${summaryBaseName}.xml`, signedSummary, 'application/xml');
    ticket = await sendSummary(config, `${summaryBaseName}.zip`, zip);
    cdr = await getSummaryStatus(config, ticket);
  }

  const cdrInfo = parseCdr(cdr);
  const cdrPath = `${folder}/R-${responseBaseName}.zip`;
  await uploadPrivateFile(supabase, cdrPath, cdr, 'application/zip');

  const status = cdrInfo.accepted ? 'aceptado' : 'rechazado';
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('comprobantes_electronicos')
    .update({
      estado_sunat: status,
      ruta_xml: xmlPath,
      ruta_pdf: pdfPath,
      ruta_cdr: cdrPath,
      ticket_sunat: ticket,
      codigo_respuesta_sunat: cdrInfo.code,
      descripcion_respuesta_sunat: cdrInfo.description,
      resumen_hash: digest,
      enviado_sunat_en: now,
      aceptado_sunat_en: cdrInfo.accepted ? now : null,
      actualizado_en: now,
    })
    .eq('id', receipt.id);

  if (updateError) throw new Error(`No se pudo actualizar el comprobante: ${updateError.message}`);

  return {
    id: receipt.id,
    type: receipt.tipo_comprobante,
    number: documentId,
    status,
    responseCode: cdrInfo.code,
    responseDescription: cdrInfo.description,
    xmlPath,
    pdfPath,
    cdrPath,
    digest,
  };
}

export function isSunatConfigurationReady() {
  try {
    getSunatConfig();
    return true;
  } catch {
    return false;
  }
}

export { XMLDSIG_NS };

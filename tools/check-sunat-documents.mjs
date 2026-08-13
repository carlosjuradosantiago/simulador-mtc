import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../supabase/functions/api/_shared/sunat.ts', import.meta.url),
  'utf8',
);

assert.match(
  source,
  /<cbc:ProfileID schemeName="SUNAT:Identificador de Tipo de Operación" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo17">0101<\/cbc:ProfileID>/,
  'The invoice must declare SUNAT operation type 0101 in ProfileID.',
);
assert.match(
  source,
  /<cbc:InvoiceTypeCode listID="0101" listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01">\$\{documentType\}<\/cbc:InvoiceTypeCode>/,
  'InvoiceTypeCode must include SUNAT operation type 0101 and the catalog 01 document type.',
);
assert.match(
  source,
  /<cac:PaymentTerms>\s*<cbc:ID>FormaPago<\/cbc:ID>\s*<cbc:PaymentMeansID>Contado<\/cbc:PaymentMeansID>\s*<\/cac:PaymentTerms>/,
  'Immediate subscription payments must be declared as Contado.',
);
assert.match(source, /\.padStart\(5, '0'\)/, 'Daily summary identifiers must use a five-digit sequence.');
assert.match(source, /<cbc:ID>\$\{escapeXml\(receipt\.serie\)\}-\$\{receipt\.numero\}<\/cbc:ID>/);
assert.match(source, /<cac:AccountingCustomerParty>[\s\S]*?<cbc:CustomerAssignedAccountID>/);
assert.match(source, /<cac:Status><cbc:ConditionCode>1<\/cbc:ConditionCode><\/cac:Status>/);
assert.doesNotMatch(source, /sac:(DocumentSerialID|StartDocumentNumberID|EndDocumentNumberID)/);

console.log('SUNAT UBL 2.1 operation and document type fields are correctly separated.');

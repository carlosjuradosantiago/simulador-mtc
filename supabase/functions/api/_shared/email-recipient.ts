function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export function resolveEmailRecipient(
  to: unknown,
  qaSourceEmail: unknown,
  qaRecipient: unknown,
  allowedRecipient: unknown,
) {
  const originalRecipient = normalizeEmail(to);
  const normalizedQaSource = normalizeEmail(qaSourceEmail);
  const normalizedQaRecipient = normalizeEmail(qaRecipient);
  const normalizedAllowedRecipient = normalizeEmail(allowedRecipient);
  const deliveryRecipient = normalizedQaSource
    && normalizedQaRecipient
    && originalRecipient === normalizedQaSource
    ? normalizedQaRecipient
    : originalRecipient;

  return {
    originalRecipient,
    deliveryRecipient,
    allowed: Boolean(deliveryRecipient)
      && (!normalizedAllowedRecipient || deliveryRecipient === normalizedAllowedRecipient),
  };
}

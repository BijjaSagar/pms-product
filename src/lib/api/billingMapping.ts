import type { FolioDetailRow, FolioItemRow, InvoiceRow, PaymentRow } from './pms';

/* The folio, transaction, payment and invoice shapes pms-backend returns, and their conversion to the rows the billing screens read. */

export interface BackendFolio {
  id: string;
  folioNumber: string;
  type: string;
  status: string;
  reservationId: string | null;
  currency: string;
  balance: string;
  summary: { charges: string; tax: string; reversals: string; payments: string; refunds: string };
}

export interface BackendTransaction {
  id: string;
  type: string;
  category: string | null;
  description: string;
  quantity: number | null;
  unitPrice: string | null;
  amount: string;
  taxAmount: string;
  postedAt: string;
}

export interface BackendPayment {
  id: string;
  folioId: string;
  paymentMethodId: string;
  amount: string;
  currency: string;
  status: string;
  reference: string | null;
  /** The total refunded against this payment, from refunds that were processed. */
  refundedAmount?: string;
  createdAt: string;
}

export interface BackendInvoice {
  id: string;
  folioId: string;
  invoiceNumber: string;
  status: string;
  taxableAmount: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  buyer: { name: string } | null;
  seller: { name: string; legalName?: string | null; address: { city?: string; line1?: string; country?: string } | null } | null;
  lines: Array<{ description: string; amount: string; quantity: number }>;
  issuedAt: string | null;
}

/** The item type the billing screen groups a transaction under. */
function itemTypeOf(transaction: BackendTransaction): string {
  if (transaction.type === 'REVERSAL') return 'REVERSAL';
  if (transaction.category === 'ROOM') return 'ROOM';
  if (transaction.category === 'FOOD_BEVERAGE') return 'POS';
  if (transaction.category === 'SERVICE') return 'SERVICE';
  return 'INCIDENTAL';
}

/** Charges and reversals as items. Payments are listed separately. A reversal stays visible, so the balance adds up. */
function folioItemsFromBackend(transactions: BackendTransaction[]): FolioItemRow[] {
  return transactions
    .filter((transaction) => transaction.type !== 'PAYMENT')
    .map((transaction) => ({
      id: transaction.id,
      type: itemTypeOf(transaction),
      description: transaction.description,
      quantity: String(transaction.quantity ?? 1),
      unitAmount: String(transaction.unitPrice ?? transaction.amount),
      taxAmount: transaction.taxAmount,
      totalAmount: (Number(transaction.amount) + Number(transaction.taxAmount)).toFixed(2),
      isVoided: false,
      createdAt: transaction.postedAt,
      billingRoute: null,
      outletId: null,
    }));
}

/** A captured payment reads as paid, and as refunded once refunds have gone through. */
function paymentStatusOf(payment: BackendPayment): string {
  const refunded = Number(payment.refundedAmount ?? 0);
  if (refunded > 0) return refunded >= Number(payment.amount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
  return payment.status === 'CAPTURED' ? 'SUCCEEDED' : payment.status;
}

export function paymentRowFromBackend(
  payment: BackendPayment,
  methodKindById: Map<string, string>,
  folio: Pick<BackendFolio, 'id' | 'folioNumber'>,
): PaymentRow {
  return {
    id: payment.id,
    folioId: folio.id,
    folioNo: folio.folioNumber,
    amount: payment.amount,
    currencyCode: payment.currency,
    method: methodKindById.get(payment.paymentMethodId) ?? 'CASH',
    status: paymentStatusOf(payment),
    reference: payment.reference,
    refundedAmount: payment.refundedAmount ?? '0.00',
    recordedAt: payment.createdAt,
    guestName: null,
  };
}

export function folioDetailFromBackend(
  folio: BackendFolio,
  transactions: BackendTransaction[],
  payments: PaymentRow[],
): FolioDetailRow {
  const charges = Number(folio.summary.charges);
  const tax = Number(folio.summary.tax);
  return {
    id: folio.id,
    folioNo: folio.folioNumber,
    status: folio.status,
    currencyCode: folio.currency,
    reservationId: folio.reservationId ?? '',
    guestName: null,
    balance: {
      charges: charges.toFixed(2),
      tax: tax.toFixed(2),
      total: (charges + tax).toFixed(2),
      paid: (-Number(folio.summary.payments)).toFixed(2),
      balance: folio.balance,
      currencyCode: folio.currency,
    },
    items: folioItemsFromBackend(transactions),
    payments,
  };
}

export function invoiceRowFromBackend(invoice: BackendInvoice, folioNo: string | null): InvoiceRow {
  return {
    id: invoice.id,
    invoiceNo: invoice.invoiceNumber,
    folioId: invoice.folioId,
    status: invoice.status,
    currencyCode: invoice.currency,
    subtotal: invoice.taxableAmount,
    taxTotal: invoice.taxAmount,
    totalAmount: invoice.totalAmount,
    issuedAt: invoice.issuedAt,
    folioNo,
    bookingCode: null,
    guestName: invoice.buyer?.name ?? null,
  };
}

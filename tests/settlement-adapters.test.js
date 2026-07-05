import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProviderSettlementAdapterRegistry,
  createProviderSettlementRecordMapper,
  getScopedSettlementRecordValue,
  parseProviderSettlementInput,
  parseSettlementCsv,
  settlementRecordsFromJson
} from '@microwavedev/backpack-game-core/modules/wallet/settlement-adapters';

test('[settlement-adapters] parses CSV exports through configured provider mappers', () => {
  const registry = createProviderSettlementAdapterRegistry({
    supportedProviders: ['provider_a'],
    adapters: {
      provider_a: createProviderSettlementRecordMapper({
        provider: 'provider_a',
        fields: {
          localIntentId: ['Order ID', 'orderId'],
          providerInvoiceId: ['Invoice ID', 'invoiceId'],
          providerPaymentId: ['Payment ID', 'paymentId'],
          status: ['Status', 'status'],
          amount: ['Amount', 'amount'],
          currency: ['Currency', 'currency'],
          settledAt: ['Settled At', 'settledAt']
        }
      })
    }
  });
  const input = registry.parseProviderSettlementInput([
    'Order ID,Invoice ID,Payment ID,Status,Amount,Currency,Settled At',
    'intent_1,invoice_1,payment_1,Settled,1.00,USD,2026-07-02T14:00:00.000Z'
  ].join('\n'), {
    provider: 'provider_a',
    format: 'csv'
  });

  assert.equal(input.format, 'csv');
  assert.equal(input.rawRecordCount, 1);
  assert.deepEqual(input.records[0], {
    'Order ID': 'intent_1',
    'Invoice ID': 'invoice_1',
    'Payment ID': 'payment_1',
    Status: 'Settled',
    Amount: '1.00',
    Currency: 'USD',
    'Settled At': '2026-07-02T14:00:00.000Z',
    provider: 'provider_a',
    localIntentId: 'intent_1',
    providerInvoiceId: 'invoice_1',
    providerPaymentId: 'payment_1',
    status: 'Settled',
    amount: '1.00',
    currency: 'USD',
    settledAt: '2026-07-02T14:00:00.000Z',
    sourceRecord: {
      'Order ID': 'intent_1',
      'Invoice ID': 'invoice_1',
      'Payment ID': 'payment_1',
      Status: 'Settled',
      Amount: '1.00',
      Currency: 'USD',
      'Settled At': '2026-07-02T14:00:00.000Z'
    }
  });
});

test('[settlement-adapters] maps nested JSON records and applies defaults', () => {
  const input = parseProviderSettlementInput(JSON.stringify({
    rows: [{
      metadata: { intentId: 'intent_2' },
      payment: { id: 'payment_2', amount: '5.50' },
      status: ''
    }]
  }), {
    provider: 'provider_b',
    supportedProviders: ['provider_b'],
    adapters: {
      provider_b: createProviderSettlementRecordMapper({
        provider: 'provider_b',
        fields: {
          localIntentId: ['intentId'],
          providerPaymentId: ['id'],
          amount: ['amount'],
          status: { keys: ['status'], defaultValue: 'completed' }
        }
      })
    }
  });

  assert.equal(input.format, 'json');
  assert.equal(input.records[0].localIntentId, 'intent_2');
  assert.equal(input.records[0].providerPaymentId, 'payment_2');
  assert.equal(input.records[0].amount, '5.50');
  assert.equal(input.records[0].status, 'completed');
});

test('[settlement-adapters] exposes low-level CSV, JSON, and scoped lookup helpers', () => {
  assert.deepEqual(parseSettlementCsv('A,B\n1,"two, too"'), [{ A: '1', B: 'two, too' }]);
  assert.deepEqual(settlementRecordsFromJson({ data: [{ id: 1 }] }), [{ id: 1 }]);
  assert.equal(getScopedSettlementRecordValue({
    metadata: {
      checkoutId: 'checkout_1'
    }
  }, ['checkoutId']), 'checkout_1');
});

test('[settlement-adapters] rejects unsupported providers when a registry declares support', () => {
  assert.throws(() => parseProviderSettlementInput('[]', {
    provider: 'missing_provider',
    supportedProviders: ['provider_a']
  }), /Unknown settlement provider/);
});

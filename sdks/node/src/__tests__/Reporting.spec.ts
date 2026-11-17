import { Zoneless } from '../index';

describe('Reporting SDK Resource', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('retrieves reconciliation report through reporting resource', async () => {
    const mockReconciliation = {
      object: 'reporting.reconciliation',
      account: 'acct_seller_123',
      currency: 'usdc',
      period_start: 1700000000,
      period_end: 1702592000,
      gross_volume: 50000,
      net_volume: 48500,
      total_fees: 1500,
      total_refunds: 0,
      total_payouts_settled: 40000,
      total_payouts_in_transit: 5000,
      ending_balance: 8500,
      charges_count: 5,
      payouts_count: 1,
      discrepancies_count: 0,
      status: 'balanced',
    };

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockReconciliation,
    });
    global.fetch = fetchMock;

    const zoneless = new Zoneless('sk_test_key', 'https://api.example.com');
    const result = await zoneless.reporting.reconciliation(
      { start: 1700000000, end: 1702592000 },
      { zonelessAccount: 'acct_seller_123' }
    );

    expect(result.object).toBe('reporting.reconciliation');
    expect(result.status).toBe('balanced');
    expect(result.gross_volume).toBe(50000);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://api.example.com/v1/reporting/reconciliation');
    expect(url).toContain('start=1700000000');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>)['zoneless-account']).toBe(
      'acct_seller_123'
    );
  });

  it('retrieves reconciliation via balanceTransactions resource', async () => {
    const mockReconciliation = {
      object: 'reporting.reconciliation',
      account: 'acct_123',
      status: 'balanced',
    };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockReconciliation,
    });
    global.fetch = fetchMock;

    const zoneless = new Zoneless('sk_test_key', 'https://api.example.com');
    const result = await zoneless.balanceTransactions.reconciliation();
    expect(result.object).toBe('reporting.reconciliation');
  });
});

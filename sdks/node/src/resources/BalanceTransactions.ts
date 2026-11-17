import { BaseResource } from './Base';
import { ApplyDateFilter } from '../utils';
import {
  BalanceTransaction,
  ListResponse,
  ReconciliationSummary,
  ReconciliationParams,
} from '@zoneless/shared-types';
import type { RequestExtraOptions } from '../HttpClient';
import type { ListBalanceTransactionsInput } from '../generated/Inputs';

export interface BalanceTransactionRequestOptions {
  /** Connected account ID to retrieve/list balance transactions for */
  zonelessAccount?: string;
}

/**
 * @see https://docs.zoneless.com/balance-transactions
 */
export class BalanceTransactions extends BaseResource {
  /**
   * Retrieve reconciliation report for the account.
   *
   * @see https://docs.zoneless.com/reporting/reconciliation
   */
  async reconciliation(
    params: ReconciliationParams = {},
    options: BalanceTransactionRequestOptions = {}
  ): Promise<ReconciliationSummary> {
    const requestOptions = this.BuildOptions(options);
    return this.client.Get<ReconciliationSummary>(
      '/reporting/reconciliation',
      params as Record<string, string | number | undefined>,
      requestOptions
    );
  }

  /** @see https://docs.zoneless.com/balance-transactions/retrieve */
  async retrieve(
    id: string,
    options: BalanceTransactionRequestOptions = {}
  ): Promise<BalanceTransaction> {
    const requestOptions = this.BuildOptions(options);
    return this.client.Get<BalanceTransaction>(
      `/balance_transactions/${id}`,
      undefined,
      requestOptions
    );
  }

  /** @see https://docs.zoneless.com/balance-transactions/list */
  async list(
    params: ListBalanceTransactionsInput = {},
    options: BalanceTransactionRequestOptions = {}
  ): Promise<ListResponse<BalanceTransaction>> {
    const query = this.BuildQuery(params);
    const requestOptions = this.BuildOptions(options);
    return this.client.Get<ListResponse<BalanceTransaction>>(
      '/balance_transactions',
      query,
      requestOptions
    );
  }

  private BuildOptions(
    options: BalanceTransactionRequestOptions
  ): RequestExtraOptions | undefined {
    if (options.zonelessAccount) {
      return { zonelessAccount: options.zonelessAccount };
    }
    return undefined;
  }

  private BuildQuery(
    params: ListBalanceTransactionsInput
  ): Record<string, string | number | undefined> {
    const query: Record<string, string | number | undefined> = {
      limit: params.limit,
      starting_after: params.starting_after,
      ending_before: params.ending_before,
      type: params.type,
      source: params.source,
      currency: params.currency,
      payout: params.payout,
    };

    ApplyDateFilter(query, 'created', params.created);

    return query;
  }
}

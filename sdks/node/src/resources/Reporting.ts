import { BaseResource } from './Base';
import {
  ReconciliationSummary,
  ReportingMetrics,
  ReconciliationParams,
  ReportingMetricsParams,
} from '@zoneless/shared-types';

export interface ReportingRequestOptions {
  /** Connected account ID for reporting and reconciliation */
  zonelessAccount?: string;
}

/**
 * Reporting and reconciliation methods.
 *
 * @see https://docs.zoneless.com/reporting
 */
export class Reporting extends BaseResource {
  /**
   * Retrieve platform or connected seller reconciliation summary.
   */
  async reconciliation(
    params: ReconciliationParams = {},
    options: ReportingRequestOptions = {}
  ): Promise<ReconciliationSummary> {
    return this.client.Get<ReconciliationSummary>(
      '/reporting/reconciliation',
      params as Record<string, string | number | undefined>,
      { zonelessAccount: options.zonelessAccount }
    );
  }

  /**
   * Retrieve overview time-series metrics.
   */
  async metrics(
    params: ReportingMetricsParams = {},
    options: ReportingRequestOptions = {}
  ): Promise<ReportingMetrics> {
    return this.client.Get<ReportingMetrics>(
      '/reporting/metrics',
      params as Record<string, string | number | undefined>,
      { zonelessAccount: options.zonelessAccount }
    );
  }
}

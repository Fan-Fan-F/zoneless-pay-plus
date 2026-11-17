/**
 * Dashboard reporting metrics types.
 *
 * Powers Stripe-style overview charts (gross volume, net volume, new customers).
 * Not a 1:1 Stripe public API object — Stripe's dashboard uses internal aggregation.
 *
 * @zoneless_extension
 */

/** Supported metric identifiers. Extend this union as new overview cards are added. */
export type MetricId = 'gross_volume' | 'net_volume' | 'new_customers';

/** Time-bucket granularity for chart series. */
export type MetricInterval = 'hour' | 'day' | 'week' | 'month';

/** Comparison mode for previous-period overlay. */
export type MetricCompare = 'previous_period' | 'none';

/** How a metric value should be formatted in the UI. */
export type MetricUnit = 'currency' | 'count';

/** A single time-bucket data point. */
export interface MetricPoint {
  /** Bucket start as unix seconds (inclusive). */
  start: number;
  /** Bucket end as unix seconds (exclusive). */
  end: number;
  /** Aggregated value — cents for currency metrics, count for count metrics. */
  value: number;
}

/** Time series + totals for one metric. */
export interface MetricSeries {
  /** Metric identifier. */
  id: MetricId;
  /** Display/formatting unit. */
  unit: MetricUnit;
  /** Sum (or count) across the current period. */
  total: number;
  /** Sum (or count) across the previous period, or null when compare is off. */
  previous_total: number | null;
  /**
   * Percent change vs previous period:
   * `((total - previous_total) / previous_total) * 100`.
   * Null when compare is off or previous_total is 0.
   */
  change_percent: number | null;
  /** Current-period buckets (empty buckets filled with value 0). */
  data: MetricPoint[];
  /** Previous-period buckets aligned by index, or null when compare is off. */
  previous_data: MetricPoint[] | null;
}

/**
 * Response from GET /v1/reporting/metrics.
 * Only requested metric ids are present in `metrics`.
 */
export interface ReportingMetrics {
  object: 'reporting.metrics';
  /** Current period start (unix seconds, inclusive). */
  start: number;
  /** Current period end (unix seconds, exclusive). */
  end: number;
  interval: MetricInterval;
  compare: MetricCompare;
  /** Currency code for currency-unit metrics. */
  currency: 'usdc';
  /** Requested metrics keyed by id. */
  metrics: Partial<Record<MetricId, MetricSeries>>;
}

/** Query parameters accepted by GET /v1/reporting/metrics. */
export interface ReportingMetricsParams {
  /** Unix start (required unless preset is set). */
  start?: number;
  /** Unix end (required unless preset is set). */
  end?: number;
  /** Convenience preset that sets start/end (e.g. "today"). */
  preset?: 'today';
  interval?: MetricInterval;
  compare?: MetricCompare;
  /** Comma-separated metric ids. Defaults to all known metrics. */
  metrics?: string;
  /** IANA timezone for bucket boundaries (e.g. America/Los_Angeles). */
  timezone?: string;
}

/**
 * Reconciliation summary breakdown for platform or connected seller account.
 * Aggregates gross volume, platform/network fees, payouts, refunds, and checks discrepancies.
 *
 * @zoneless_extension
 */
export interface ReconciliationSummary {
  object: 'reporting.reconciliation';
  account: string;
  currency: 'usdc';
  period_start: number;
  period_end: number;
  gross_volume: number;
  net_volume: number;
  total_fees: number;
  total_refunds: number;
  total_payouts_settled: number;
  total_payouts_in_transit: number;
  ending_balance: number;
  charges_count: number;
  payouts_count: number;
  discrepancies_count: number;
  status: 'balanced' | 'discrepancy_detected';
}

/** Query parameters accepted by GET /v1/reporting/reconciliation. */
export interface ReconciliationParams {
  start?: number;
  end?: number;
  account?: string;
  currency?: string;
}


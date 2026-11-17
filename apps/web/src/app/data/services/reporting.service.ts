import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { ApiService } from '../../core';
import {
  MetricCompare,
  MetricId,
  MetricInterval,
  ReportingMetrics,
  ReconciliationSummary,
} from '@zoneless/shared-types';

export interface FetchMetricsOptions {
  start?: number;
  end?: number;
  preset?: 'today';
  interval?: MetricInterval;
  compare?: MetricCompare;
  metrics?: MetricId[];
}

@Injectable({
  providedIn: 'root',
})
export class ReportingService {
  private readonly api = inject(ApiService);
  private readonly timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  overviewMetrics: WritableSignal<ReportingMetrics | null> = signal(null);
  todayMetrics: WritableSignal<ReportingMetrics | null> = signal(null);
  overviewLoading: WritableSignal<boolean> = signal(false);
  todayLoading: WritableSignal<boolean> = signal(false);

  reconciliationSummary: WritableSignal<ReconciliationSummary | null> =
    signal(null);
  reconciliationLoading: WritableSignal<boolean> = signal(false);

  Reset(): void {
    this.overviewMetrics.set(null);
    this.todayMetrics.set(null);
    this.reconciliationSummary.set(null);
  }

  async GetReconciliation(options?: {
    start?: number;
    end?: number;
    account?: string;
  }): Promise<ReconciliationSummary> {
    this.reconciliationLoading.set(true);
    try {
      const params: Record<string, string> = {};
      if (options?.start !== undefined) params['start'] = String(options.start);
      if (options?.end !== undefined) params['end'] = String(options.end);
      if (options?.account) params['account'] = options.account;

      const summary = await this.api.Call<ReconciliationSummary>(
        'GET',
        'reporting/reconciliation',
        params
      );
      this.reconciliationSummary.set(summary);
      return summary;
    } finally {
      this.reconciliationLoading.set(false);
    }
  }

  async GetTodayMetrics(): Promise<ReportingMetrics> {
    this.todayLoading.set(true);
    try {
      const now = new Date();
      const startMs = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime();
      const endMs = startMs + 24 * 60 * 60 * 1000;
      const metrics = await this.FetchMetrics({
        start: Math.floor(startMs / 1000),
        end: Math.floor(endMs / 1000),
        interval: 'hour',
        compare: 'previous_period',
        metrics: ['gross_volume'],
      });
      this.todayMetrics.set(metrics);
      return metrics;
    } finally {
      this.todayLoading.set(false);
    }
  }

  async GetOverviewMetrics(options: {
    start: number;
    end: number;
    interval: MetricInterval;
    compare: MetricCompare;
  }): Promise<ReportingMetrics> {
    this.overviewLoading.set(true);
    try {
      const metrics = await this.FetchMetrics({
        start: options.start,
        end: options.end,
        interval: options.interval,
        compare: options.compare,
        metrics: ['gross_volume', 'net_volume', 'new_customers'],
      });
      this.overviewMetrics.set(metrics);
      return metrics;
    } finally {
      this.overviewLoading.set(false);
    }
  }

  private async FetchMetrics(
    options: FetchMetricsOptions
  ): Promise<ReportingMetrics> {
    const params: Record<string, string> = {
      timezone: this.timezone,
    };

    if (options.preset) {
      params['preset'] = options.preset;
    }
    if (options.start !== undefined) {
      params['start'] = String(options.start);
    }
    if (options.end !== undefined) {
      params['end'] = String(options.end);
    }
    if (options.interval) {
      params['interval'] = options.interval;
    }
    if (options.compare) {
      params['compare'] = options.compare;
    }
    if (options.metrics?.length) {
      params['metrics'] = options.metrics.join(',');
    }

    return this.api.Call<ReportingMetrics>('GET', 'reporting/metrics', params);
  }
}

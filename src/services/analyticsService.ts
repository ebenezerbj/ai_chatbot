import { LLMProvider } from '../core/types';

export interface AnalyticsData {
  totalConversations: number;
  totalMessages: number;
  ragQueries: number;
  ragMatches: number;
  handoversSuggested: number;
  handoversCompleted: number;
  latencies: number[];
  providerCounts: Record<string, number>;
}

class AnalyticsService {
  private analytics: AnalyticsData = {
    totalConversations: 0,
    totalMessages: 0,
    ragQueries: 0,
    ragMatches: 0,
    handoversSuggested: 0,
    handoversCompleted: 0,
    latencies: [],
    providerCounts: {},
  };

  public getAnalytics(): AnalyticsData {
    return { ...this.analytics };
  }

  public trackLatency(duration: number) {
    this.analytics.latencies.push(duration);
    if (this.analytics.latencies.length > 100) {
      this.analytics.latencies.shift(); // Keep last 100
    }
  }

  public increment<K extends keyof AnalyticsData>(key: K, amount: number = 1) {
    if (typeof this.analytics[key] === 'number') {
      (this.analytics[key] as number) += amount;
    }
  }

  public trackProvider(provider: LLMProvider) {
    const name = provider.name;
    this.analytics.providerCounts[name] = (this.analytics.providerCounts[name] || 0) + 1;
  }
}

export const analyticsService = new AnalyticsService();

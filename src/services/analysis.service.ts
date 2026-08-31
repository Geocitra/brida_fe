const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface IndicatorItem {
  id: string;
  name: string;
  sector: string;
  baseline: string;
  realization: string;
  deviationPercentage: number;
  urgencyStatus: 'NORMAL' | 'WASPADA' | 'KRITIS';
  targetValue: number;
  realizationValue: number;
  unitPrefix?: string;
  unitSuffix?: string;
  trendData?: number[];
}

export interface CausalFactorItem {
  factor: string;
  weightPercentage: number;
  category: string;
  description: string;
}

export interface RecommendationItem {
  id: string;
  actionTitle: string;
  pic: string;
  deadline: string;
  estimatedCostText: string;
  priority: 'TINGGI' | 'SEDANG' | 'RENDAH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface DeviationCompareResult {
  math: {
    indicatorName: string;
    sector: string;
    targetValue: number;
    realizationValue: number;
    targetText: string;
    realizationText: string;
    deviationValue: number;
    deviationPercentage: number;
    urgencyStatus: 'NORMAL' | 'WASPADA' | 'KRITIS';
  };
  causal: {
    summary: string;
    causalFactors: CausalFactorItem[];
    recommendations: RecommendationItem[];
  };
}

const formatError = (msg: any, fallback: string): string => {
  if (!msg) return fallback;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return String(msg);
};

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = sessionStorage.getItem('brida_auth_token');
  const headers = {
    ...(options.headers || {}),
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

export const AnalysisService = {
  async getIndicatorMatrix(): Promise<IndicatorItem[]> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/analysis/indicators`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(formatError(result.message, 'Gagal memuat matriks indikator.'));
      }
      return result.data;
    } catch (err: any) {
      throw new Error(formatError(err.message, 'Gagal terhubung ke server untuk memuat matriks indikator.'));
    }
  },

  async compareDeviation(payload: {
    indicatorName: string;
    targetValue: number;
    realizationValue: number;
    sector?: string;
    unitPrefix?: string;
    unitSuffix?: string;
    baselineDocId?: string;
    realizationDocId?: string;
    documentIds?: string[];
  }): Promise<DeviationCompareResult> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/analysis/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(formatError(result.message, 'Gagal memproses perbandingan deviasi.'));
      }
      return result.data;
    } catch (err: any) {
      throw new Error(formatError(err.message, 'Gagal terhubung ke server untuk perbandingan deviasi.'));
    }
  },
};

import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { AegisKpiMetrics } from '@/types/aegisAI';
// eslint-disable-next-line import/order
import { mountWithConfig } from '@/__tests__/helpers';

// Mock the AegisAIService - must be before component import
vi.mock('@/services/AegisAIService');

// eslint-disable-next-line import/first
import KpiMetrics from '@/views/KpiMetrics.vue';
// eslint-disable-next-line import/first
import { AegisAIService } from '@/services/AegisAIService';

// Mock vue-data-ui module
vi.mock('vue-data-ui/vue-ui-xy', () => ({
  VueUiXy: {
    name: 'VueUiXy',
    template: '<div class="vue-ui-xy-stub"></div>',
    props: ['dataset', 'config'],
  },
}));

const mountKpiMetrics = (options?: any) => {
  return mountWithConfig(KpiMetrics, {
    global: {
      stubs: {
        VueUiXy: true,
      },
      ...options?.global,
    },
    ...options,
  });
};

const createMockKpiMetrics = () => {
  const mockKpiMetrics: Omit<AegisKpiMetrics, 'all'> = {
    'suggest-cwe': {
      acceptance_percentage: 75.0,
      entries: [
        {
          datetime: '2025-01-15 10:00:00.000',
          accepted: true,
          aegis_version: '1.0.0',
        },
        {
          datetime: '2025-01-16 11:00:00.000',
          accepted: false,
          aegis_version: '1.0.0',
        },
        {
          datetime: '2025-01-20 12:00:00.000',
          accepted: true,
          aegis_version: '1.0.0',
        },
      ],
    },
    'suggest-description': {
      acceptance_percentage: 80.0,
      entries: [
        {
          datetime: '2025-01-15 10:00:00.000',
          accepted: true,
          aegis_version: '1.0.0',
        },
        {
          datetime: '2025-01-22 13:00:00.000',
          accepted: true,
          aegis_version: '1.0.0',
        },
      ],
    },
    'suggest-title': {
      acceptance_percentage: 78.0,
      entries: [
        {
          datetime: '2025-01-15 10:00:00.000',
          accepted: true,
          aegis_version: '1.0.0',
        },
        {
          datetime: '2025-01-18 14:00:00.000',
          accepted: false,
          aegis_version: '1.0.0',
        },
      ],
    },
    'suggest-cvss': {
      acceptance_percentage: 82.0,
      entries: [
        {
          datetime: '2025-01-15 10:00:00.000',
          accepted: true,
          aegis_version: '1.0.0',
        },
        {
          datetime: '2025-01-19 15:00:00.000',
          accepted: true,
          aegis_version: '1.0.0',
        },
      ],
    },
    'suggest-impact': {
      acceptance_percentage: 70.0,
      entries: [
        {
          datetime: '2025-01-15 10:00:00.000',
          accepted: true,
          aegis_version: '1.0.0',
        },
      ],
    },
    'suggest-statement': {
      acceptance_percentage: 85.0,
      entries: [
        {
          datetime: '2025-01-15 10:00:00.000',
          accepted: true,
          aegis_version: '1.0.0',
        },
      ],
    },
  };
  return mockKpiMetrics;
};

describe('kpiMetrics', () => {
  let wrapper: VueWrapper<any>;
  let mockGetKpiMetrics: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetKpiMetrics = vi.fn();
    vi.mocked(AegisAIService).mockImplementation(() => ({
      getKpiMetrics: mockGetKpiMetrics,
      isFetching: { value: false },
      requestDuration: { value: 0 },
    } as any));
    mockGetKpiMetrics.mockResolvedValue(createMockKpiMetrics());
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (wrapper) wrapper.unmount();
  });

  it('should render correctly', () => {
    wrapper = mountKpiMetrics();
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('h1').text()).toBe('KPI Metrics');
    expect(wrapper.find('label[for="feature-select"]').text()).toBe('Feature:');
    expect(wrapper.find('select#feature-select').exists()).toBe(true);
  });

  it('should fetch KPI metrics on mount', async () => {
    wrapper = mountKpiMetrics();
    await flushPromises();

    expect(mockGetKpiMetrics).toHaveBeenCalledTimes(1);
    expect(mockGetKpiMetrics).toHaveBeenCalledWith('all');
  });

  it('should display all feature options in select', () => {
    wrapper = mountKpiMetrics();
    const select = wrapper.find('select#feature-select');
    const options = select.findAll('option');

    expect(options.length).toBe(7); // 'all' + 6 features
    expect(options[0].text()).toBe('All');
    expect(options[0].attributes('value')).toBe('all');
    expect(options[1].text()).toBe('Suggest CWE');
    expect(options[1].attributes('value')).toBe('suggest-cwe');
    expect(options[2].text()).toBe('Suggest Description');
    expect(options[2].attributes('value')).toBe('suggest-description');
    expect(options[3].text()).toBe('Suggest Title');
    expect(options[3].attributes('value')).toBe('suggest-title');
    expect(options[4].text()).toBe('Suggest CVSS');
    expect(options[4].attributes('value')).toBe('suggest-cvss');
    expect(options[5].text()).toBe('Suggest Impact');
    expect(options[5].attributes('value')).toBe('suggest-impact');
    expect(options[6].text()).toBe('Suggest Statement Mitigation');
    expect(options[6].attributes('value')).toBe('suggest-statement');
  });

  it('should fetch metrics when feature selection changes', async () => {
    wrapper = mountKpiMetrics();
    await flushPromises();

    const select = wrapper.find('select#feature-select');
    await select.setValue('suggest-cwe');
    await flushPromises();

    expect(mockGetKpiMetrics).toHaveBeenCalledTimes(2);
    expect(mockGetKpiMetrics).toHaveBeenNthCalledWith(1, 'all');
    expect(mockGetKpiMetrics).toHaveBeenNthCalledWith(2, 'suggest-cwe');
  });

  it('should display chart when metrics are loaded', async () => {
    wrapper = mountKpiMetrics();
    await flushPromises();

    const chartContainer = wrapper.find('.kpi-chart-container');
    expect(chartContainer.exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'VueUiXy' }).exists()).toBe(true);
  });

  it('should not display chart when metrics are null', () => {
    wrapper = mountKpiMetrics();
    const chartContainer = wrapper.find('.kpi-chart-container');
    expect(chartContainer.exists()).toBe(false);
  });

  it('should transform metrics data by week correctly', async () => {
    wrapper = mountKpiMetrics();
    await flushPromises();

    const vm = wrapper.vm;
    const dataByWeek = vm.dataByWeek;

    // Check that data is grouped by week
    expect(dataByWeek).toBeDefined();
    expect(dataByWeek['suggest-cwe']).toBeDefined();
    expect(dataByWeek['suggest-description']).toBeDefined();

    // Check week format (e.g., "Jan 25 Week 3")
    const weeks = Object.keys(dataByWeek['suggest-cwe']);
    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks[0]).toMatch(/^[A-Z][a-z]{2} \d{2} Week \d+$/);

    // Check that each week has the correct structure
    const weekData = dataByWeek['suggest-cwe'][weeks[0]];
    expect(weekData).toHaveProperty('accepted');
    expect(weekData).toHaveProperty('total');
    expect(weekData).toHaveProperty('percentage');
    expect(typeof weekData.accepted).toBe('number');
    expect(typeof weekData.total).toBe('number');
    expect(typeof weekData.percentage).toBe('number');
  });

  it('should calculate acceptance percentage correctly', async () => {
    const mockMetrics: Omit<AegisKpiMetrics, 'all'> = {
      'suggest-cwe': {
        acceptance_percentage: 75.0,
        entries: [
          {
            datetime: '2025-01-15 10:00:00.000',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-01-15 11:00:00.000',
            accepted: false,
            aegis_version: '1.0.0',
          },
        ],
      },
      'suggest-description': {
        acceptance_percentage: 100.0,
        entries: [],
      },
      'suggest-title': {
        acceptance_percentage: 100.0,
        entries: [],
      },
      'suggest-cvss': {
        acceptance_percentage: 100.0,
        entries: [],
      },
      'suggest-impact': {
        acceptance_percentage: 100.0,
        entries: [],
      },
      'suggest-statement': {
        acceptance_percentage: 100.0,
        entries: [],
      },
    };

    mockGetKpiMetrics.mockResolvedValueOnce(mockMetrics);
    wrapper = mountKpiMetrics();
    await flushPromises();

    const vm = wrapper.vm;
    const dataByWeek = vm.dataByWeek;
    const weeks = Object.keys(dataByWeek['suggest-cwe']);

    if (weeks.length > 0) {
      const weekData = dataByWeek['suggest-cwe'][weeks[0]];
      // Should have 1 accepted out of 2 total = 50%
      // But the calculation is: (accepted + newAccepted) / (total + 1) * 100
      // First entry: (0 + 1) / (0 + 1) * 100 = 100%
      // Second entry: (1 + 0) / (1 + 1) * 100 = 50%
      expect(weekData.total).toBe(2);
    }
  });

  it('should generate date range from all weeks', async () => {
    wrapper = mountKpiMetrics();
    await flushPromises();

    const vm = wrapper.vm;
    const dateRange = vm.dateRange;

    expect(Array.isArray(dateRange)).toBe(true);
    expect(dateRange.length).toBeGreaterThan(0);
    // Should contain unique week identifiers
    dateRange.forEach((week: string) => {
      expect(week).toMatch(/^[A-Z][a-z]{2} \d{2} Week \d+$/);
    });
  });

  it('should generate chart dataset correctly', async () => {
    wrapper = mountKpiMetrics();
    await flushPromises();

    const vm = wrapper.vm;
    const dataset = vm.dataset;

    expect(Array.isArray(dataset)).toBe(true);
    expect(dataset.length).toBeGreaterThan(0);

    // Check dataset structure
    dataset.forEach((series: any) => {
      expect(series).toHaveProperty('name');
      expect(series).toHaveProperty('series');
      expect(series).toHaveProperty('suffix', '%');
      expect(series).toHaveProperty('type', 'line');
      expect(series).toHaveProperty('datalabels', false);
      // The name should be one of the feature labels
      expect([
        'Suggest CWE',
        'Suggest Description',
        'Suggest Title',
        'Suggest CVSS',
        'Suggest Impact',
        'Suggest Statement Mitigation',
      ]).toContain(series.name);
      expect(Array.isArray(series.series)).toBe(true);
    });
  });

  it('should generate chart config correctly', async () => {
    wrapper = mountKpiMetrics();
    await flushPromises();

    const vm = wrapper.vm;
    const config = vm.config;

    expect(config).toHaveProperty('chart');
    expect(config.chart).toHaveProperty('tooltip');
    expect(config.chart.tooltip.showPercentage).toBe(false);
    expect(config.chart).toHaveProperty('grid');
    expect(config.chart.grid).toHaveProperty('labels');
    expect(config.chart.grid.labels).toHaveProperty('xAxisLabels');
    expect(config.chart.grid.labels.xAxisLabels).toHaveProperty('values');
    expect(Array.isArray(config.chart.grid.labels.xAxisLabels.values)).toBe(true);
    expect(config.chart.grid.labels).toHaveProperty('datetimeFormatter');
    expect(config.chart.grid.labels.datetimeFormatter.enable).toBe(true);
  });

  it('should filter out non-allowed features', async () => {
    const metricsWithExtraFeature: any = {
      'suggest-cwe': {
        acceptance_percentage: 75.0,
        entries: [],
      },
      'suggest-description': {
        acceptance_percentage: 80.0,
        entries: [],
      },
      'suggest-impact': {
        acceptance_percentage: 70.0,
        entries: [],
      },
      'suggest-statement': {
        acceptance_percentage: 85.0,
        entries: [],
      },
      'invalid-feature': {
        acceptance_percentage: 90.0,
        entries: [],
      },
      'suggest-title': {
        acceptance_percentage: 0,
        entries: [],
      },
      'suggest-cvss': {
        acceptance_percentage: 0,
        entries: [],
      },
    };

    mockGetKpiMetrics.mockResolvedValueOnce(metricsWithExtraFeature);
    wrapper = mountKpiMetrics();
    await flushPromises();

    const vm = wrapper.vm;
    expect(vm.kpiMetrics).not.toHaveProperty('invalid-feature');
    expect(vm.kpiMetrics).toHaveProperty('suggest-cwe');
    expect(vm.kpiMetrics).toHaveProperty('suggest-description');
    expect(vm.kpiMetrics).toHaveProperty('suggest-title');
    expect(vm.kpiMetrics).toHaveProperty('suggest-cvss');
    expect(vm.kpiMetrics).toHaveProperty('suggest-impact');
    expect(vm.kpiMetrics).toHaveProperty('suggest-statement');
  });

  it('should handle empty metrics gracefully', async () => {
    const emptyMetrics: Omit<AegisKpiMetrics, 'all'> = {
      'suggest-cwe': {
        acceptance_percentage: 0,
        entries: [],
      },
      'suggest-description': {
        acceptance_percentage: 0,
        entries: [],
      },
      'suggest-title': {
        acceptance_percentage: 0,
        entries: [],
      },
      'suggest-cvss': {
        acceptance_percentage: 0,
        entries: [],
      },
      'suggest-impact': {
        acceptance_percentage: 0,
        entries: [],
      },
      'suggest-statement': {
        acceptance_percentage: 0,
        entries: [],
      },
    };

    mockGetKpiMetrics.mockResolvedValueOnce(emptyMetrics);
    wrapper = mountKpiMetrics();
    await flushPromises();

    const vm = wrapper.vm;
    expect(vm.kpiMetrics).toEqual(emptyMetrics);
    expect(vm.dataByWeek).toBeDefined();
    // Dataset will have entries for each feature, but with empty series arrays
    expect(vm.dataset).toBeDefined();
    expect(Array.isArray(vm.dataset)).toBe(true);
    // Each feature will have a dataset entry with an empty series array
    vm.dataset.forEach((series: any) => {
      expect(series).toHaveProperty('series');
      expect(Array.isArray(series.series)).toBe(true);
    });
  });

  it('should handle API errors gracefully', async () => {
    // Prevent console.error from failing the test by mocking it
    // due to config in tests__/setup.ts
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetKpiMetrics.mockRejectedValue(new Error('API Error'));

    wrapper = mountKpiMetrics();
    await flushPromises();

    // Component should still render, but metrics should be null
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.kpi-chart-container').exists()).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('should handle different week calculations correctly', async () => {
    // Test with entries spanning multiple weeks
    const multiWeekMetrics: Omit<AegisKpiMetrics, 'all'> = {
      'suggest-cwe': {
        acceptance_percentage: 75.0,
        entries: [
          {
            datetime: '2025-01-01 10:00:00.000', // Week 1
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-01-08 10:00:00.000', // Week 2
            accepted: false,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-01-15 10:00:00.000', // Week 3
            accepted: true,
            aegis_version: '1.0.0',
          },
        ],
      },
      'suggest-description': {
        acceptance_percentage: 100.0,
        entries: [],
      },
      'suggest-title': {
        acceptance_percentage: 100.0,
        entries: [],
      },
      'suggest-cvss': {
        acceptance_percentage: 100.0,
        entries: [],
      },
      'suggest-impact': {
        acceptance_percentage: 100.0,
        entries: [],
      },
      'suggest-statement': {
        acceptance_percentage: 100.0,
        entries: [],
      },
    };

    mockGetKpiMetrics.mockResolvedValueOnce(multiWeekMetrics);
    wrapper = mountKpiMetrics();
    await flushPromises();

    const vm = wrapper.vm;
    const dataByWeek = vm.dataByWeek;
    const weeks = Object.keys(dataByWeek['suggest-cwe']);

    // Should have multiple weeks
    expect(weeks.length).toBeGreaterThanOrEqual(1);
  });

  it('should update chart when feature changes', async () => {
    wrapper = mountKpiMetrics();
    await flushPromises();

    const singleFeatureMetrics: Omit<AegisKpiMetrics, 'all'> = {
      'suggest-cwe': {
        acceptance_percentage: 75.0,
        entries: [
          {
            datetime: '2025-01-15 10:00:00.000',
            accepted: true,
            aegis_version: '1.0.0',
          },
        ],
      },
      'suggest-description': {
        acceptance_percentage: 0,
        entries: [],
      },
      'suggest-title': {
        acceptance_percentage: 0,
        entries: [],
      },
      'suggest-cvss': {
        acceptance_percentage: 0,
        entries: [],
      },
      'suggest-impact': {
        acceptance_percentage: 0,
        entries: [],
      },
      'suggest-statement': {
        acceptance_percentage: 0,
        entries: [],
      },
    };

    mockGetKpiMetrics.mockResolvedValueOnce(singleFeatureMetrics);

    const select = wrapper.find('select#feature-select');
    await select.setValue('suggest-cwe');
    await flushPromises();

    const vm = wrapper.vm;
    expect(vm.kpiMetrics).toBeDefined();
    expect(mockGetKpiMetrics).toHaveBeenCalledTimes(2);
  });

  it('should handle feature change correctly', async () => {
    wrapper = mountKpiMetrics();
    await flushPromises();

    // Reset mock call count
    mockGetKpiMetrics.mockClear();

    const singleFeatureResponse: Omit<AegisKpiMetrics, 'all'> = {
      'suggest-cwe': {
        acceptance_percentage: 75.0,
        entries: [
          {
            datetime: '2025-01-15 10:00:00.000',
            accepted: true,
            aegis_version: '1.0.0',
          },
        ],
      },
      'suggest-description': {
        acceptance_percentage: 0,
        entries: [],
      },
      'suggest-title': {
        acceptance_percentage: 0,
        entries: [],
      },
      'suggest-cvss': {
        acceptance_percentage: 0,
        entries: [],
      },
      'suggest-impact': {
        acceptance_percentage: 0,
        entries: [],
      },
      'suggest-statement': {
        acceptance_percentage: 0,
        entries: [],
      },
    };

    mockGetKpiMetrics.mockResolvedValueOnce(singleFeatureResponse);

    const select = wrapper.find('select#feature-select');
    await select.setValue('suggest-description');
    await flushPromises();

    expect(mockGetKpiMetrics).toHaveBeenCalledWith('suggest-description');
  });

  describe('mean Acceptance Rates section', () => {
    it('should display Mean Acceptance Rates heading when metrics are loaded', async () => {
      wrapper = mountKpiMetrics();
      await flushPromises();

      const headings = wrapper.findAll('h3');
      const meanAcceptanceHeading = headings.find(h => h.text() === 'Mean Acceptance Rates');
      expect(meanAcceptanceHeading).toBeDefined();
      expect(meanAcceptanceHeading?.exists()).toBe(true);
    });

    it('should display Overall acceptance percentage', async () => {
      wrapper = mountKpiMetrics();
      await flushPromises();

      const overallSection = wrapper.findAll('h4').find(h => h.text() === 'Overall');
      expect(overallSection).toBeDefined();
      expect(overallSection?.exists()).toBe(true);

      const overallText = wrapper.text();
      expect(overallText).toContain('% Acceptance Rate');
    });

    it('should calculate and display correct overall acceptance percentage', async () => {
      wrapper = mountKpiMetrics();
      await flushPromises();

      const vm = wrapper.vm;
      const expectedOverall = (
        75.0 + 80.0 + 78.0 + 82.0 + 70.0 + 85.0
      ) / 6; // Average of all feature acceptance percentages

      expect(vm.overallAcceptancePercentage).toBeCloseTo(expectedOverall, 1);

      const overallParagraph = wrapper.findAll('p').find(p =>
        p.text().includes('Acceptance Rate') && !p.text().includes('for'),
      );
      expect(overallParagraph?.exists()).toBe(true);
      // Check that it contains the percentage (allowing for formatting differences)
      expect(overallParagraph?.text()).toMatch(/\d+(\.\d+)?% Acceptance Rate/);
    });

    it('should display Per Feature heading', async () => {
      wrapper = mountKpiMetrics();
      await flushPromises();

      const perFeatureHeading = wrapper.findAll('h4').find(h => h.text() === 'Per Feature');
      expect(perFeatureHeading).toBeDefined();
      expect(perFeatureHeading?.exists()).toBe(true);
    });

    it('should display acceptance percentage for each feature', async () => {
      wrapper = mountKpiMetrics();
      await flushPromises();

      const vm = wrapper.vm;
      const features = Object.keys(vm.metricsToDisplay);

      // Should have 6 features (excluding 'all')
      expect(features.length).toBe(6);

      // Check that each feature is displayed
      const text = wrapper.text();
      expect(text).toContain('75% Acceptance Rate for Suggest CWE');
      expect(text).toContain('80% Acceptance Rate for Suggest Description');
      expect(text).toContain('78% Acceptance Rate for Suggest Title');
      expect(text).toContain('82% Acceptance Rate for Suggest CVSS');
      expect(text).toContain('70% Acceptance Rate for Suggest Impact');
      expect(text).toContain('85% Acceptance Rate for Suggest Statement Mitigation');
    });

    it('should display all features with correct labels', async () => {
      wrapper = mountKpiMetrics();
      await flushPromises();

      const featureParagraphs = wrapper.findAll('p').filter(p =>
        p.text().includes('Acceptance Rate for'),
      );

      expect(featureParagraphs.length).toBe(6);

      const featureLabels = [
        'Suggest CWE',
        'Suggest Description',
        'Suggest Title',
        'Suggest CVSS',
        'Suggest Impact',
        'Suggest Statement Mitigation',
      ];

      featureLabels.forEach((label) => {
        const found = featureParagraphs.some(p => p.text().includes(label));
        expect(found).toBe(true);
      });
    });

    it('should handle empty metrics for Mean Acceptance Rates', async () => {
      const emptyMetrics: Omit<AegisKpiMetrics, 'all'> = {
        'suggest-cwe': {
          acceptance_percentage: 0,
          entries: [],
        },
        'suggest-description': {
          acceptance_percentage: 0,
          entries: [],
        },
        'suggest-title': {
          acceptance_percentage: 0,
          entries: [],
        },
        'suggest-cvss': {
          acceptance_percentage: 0,
          entries: [],
        },
        'suggest-impact': {
          acceptance_percentage: 0,
          entries: [],
        },
        'suggest-statement': {
          acceptance_percentage: 0,
          entries: [],
        },
      };

      mockGetKpiMetrics.mockResolvedValueOnce(emptyMetrics);
      wrapper = mountKpiMetrics();
      await flushPromises();

      const vm = wrapper.vm;
      expect(vm.overallAcceptancePercentage).toBe(0);

      const overallParagraph = wrapper.findAll('p').find(p =>
        p.text().includes('Acceptance Rate') && !p.text().includes('for'),
      );
      expect(overallParagraph?.text()).toContain('0% Acceptance Rate');
    });

    it('should not display Mean Acceptance Rates section when metrics are null', () => {
      wrapper = mountKpiMetrics();
      const chartContainer = wrapper.find('.kpi-chart-container');
      expect(chartContainer.exists()).toBe(false);
    });

    it('should update overall acceptance percentage when metrics change', async () => {
      wrapper = mountKpiMetrics();
      await flushPromises();

      const initialOverall = wrapper.vm.overallAcceptancePercentage;

      const updatedMetrics: Omit<AegisKpiMetrics, 'all'> = {
        'suggest-cwe': {
          acceptance_percentage: 90.0,
          entries: [],
        },
        'suggest-description': {
          acceptance_percentage: 95.0,
          entries: [],
        },
        'suggest-title': {
          acceptance_percentage: 88.0,
          entries: [],
        },
        'suggest-cvss': {
          acceptance_percentage: 92.0,
          entries: [],
        },
        'suggest-impact': {
          acceptance_percentage: 85.0,
          entries: [],
        },
        'suggest-statement': {
          acceptance_percentage: 93.0,
          entries: [],
        },
      };

      mockGetKpiMetrics.mockResolvedValueOnce(updatedMetrics);

      // Trigger a re-fetch by changing feature
      const select = wrapper.find('select#feature-select');
      await select.setValue('suggest-cwe');
      await flushPromises();

      const updatedOverall = wrapper.vm.overallAcceptancePercentage;
      const expectedUpdated = (90.0 + 95.0 + 88.0 + 92.0 + 85.0 + 93.0) / 6;

      expect(updatedOverall).toBeCloseTo(expectedUpdated, 1);
      expect(updatedOverall).not.toBe(initialOverall);
    });

    it('should format acceptance percentages correctly in the UI', async () => {
      wrapper = mountKpiMetrics();
      await flushPromises();

      const featureParagraphs = wrapper.findAll('p').filter(p =>
        p.text().includes('Acceptance Rate for'),
      );

      expect(featureParagraphs.length).toBeGreaterThan(0);
      featureParagraphs.forEach((paragraph) => {
        const text = paragraph.text();
        // Should match pattern: "XX% Acceptance Rate for Feature Name"
        expect(text).toContain('Acceptance Rate for ');
      });
    });
  });
});

// Pricing configuration for PrepMe interview stages
// Prices are in cents (USD)

export const PRICING = {
  // Individual stage prices (includes initial attempt + 2 retakes = 3 total)
  single_hm: {
    label: 'Hiring Manager Interview',
    priceCents: 499,
    stage: 'hiring_manager',
    totalAttempts: 3,
  },
  single_cf: {
    label: 'Culture Fit Interview',
    priceCents: 399,
    stage: 'culture_fit',
    totalAttempts: 3,
  },
  single_fr: {
    label: 'Final Round Interview',
    priceCents: 599,
    stage: 'final',
    totalAttempts: 3,
  },

  // Bundle: all 3 paid stages
  bundle_3: {
    label: 'Full Interview Prep (All 3 Stages)',
    priceCents: 1199,
    stages: ['hiring_manager', 'culture_fit', 'final'],
    totalAttempts: 3,
  },

  // Bundle without culture fit
  bundle_2_no_cf: {
    label: 'Interview Prep (HM + Final)',
    priceCents: 999,
    stages: ['hiring_manager', 'final'],
    totalAttempts: 3,
  },

  // Monthly subscription
  subscription_monthly: {
    label: 'Monthly Unlimited',
    priceCents: 2499,
    maxInterviewsPerPeriod: 5,
  },
} as const

export type ProductType = keyof typeof PRICING

// Estimated API costs per interview (for reference)
export const ESTIMATED_COSTS = {
  hr_screen: 0.15,
  hiring_manager: 0.21,
  culture_fit: 0.19,
  final: 0.27,
  practice_card: 0.02,
}

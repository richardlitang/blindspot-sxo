// LemonSqueezy integration utilities

import { supabase } from './supabase'

export type PriceType = 'builder' | 'agency'

export interface CheckoutResponse {
  url?: string
  error?: string
}

export async function createCheckoutSession(priceType: PriceType): Promise<CheckoutResponse> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: 'Not authenticated' }
  }

  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        priceType,
      },
    })

    if (error) {
      return { error: error.message }
    }

    return data as CheckoutResponse
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Checkout failed' }
  }
}

// Open LemonSqueezy checkout in a new tab
export async function openCheckout(priceType: PriceType): Promise<{ success: boolean; error?: string }> {
  const response = await createCheckoutSession(priceType)

  if (response.error) {
    return { success: false, error: response.error }
  }

  if (response.url) {
    // Open in new tab
    window.open(response.url, '_blank')
    return { success: true }
  }

  return { success: false, error: 'No checkout URL returned' }
}

// Pricing info for UI
export const PRICING = {
  builder: {
    name: 'Builder Pack',
    price: '$12',
    priceDetail: 'one-time',
    credits: 20,
    features: [
      '20 audit credits',
      'All analysis modes',
      'PDF export',
      'Never expires',
    ],
  },
  agency: {
    name: 'Agency Pro',
    price: '$49',
    priceDetail: '/month',
    credits: -1, // Unlimited
    features: [
      'Unlimited audits',
      'All analysis modes',
      'PDF export',
      'Journey flow audits',
      'Priority support',
    ],
  },
}

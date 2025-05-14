// Supabase Edge Function: /create-checkout
// Creates LemonSqueezy Checkout sessions for credit purchases and subscriptions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckoutRequest {
  priceType: 'builder' | 'agency'
}

// Variant IDs - set these in LemonSqueezy Dashboard and update via secrets
const VARIANT_CONFIG = {
  builder: {
    // One-time payment: $12 for 20 credits
    variantId: Deno.env.get('LEMONSQUEEZY_BUILDER_VARIANT_ID') || '',
    credits: 20,
  },
  agency: {
    // Subscription: $49/month unlimited
    variantId: Deno.env.get('LEMONSQUEEZY_AGENCY_VARIANT_ID') || '',
    credits: -1, // Unlimited
  },
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const body: CheckoutRequest = await req.json()
    const { priceType } = body

    if (!priceType || !VARIANT_CONFIG[priceType]) {
      return new Response(
        JSON.stringify({ error: 'Invalid price type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize LemonSqueezy
    const apiKey = Deno.env.get('LEMONSQUEEZY_API_KEY')
    const storeId = Deno.env.get('LEMONSQUEEZY_STORE_ID')

    if (!apiKey || !storeId) {
      return new Response(
        JSON.stringify({ error: 'LemonSqueezy not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const variantConfig = VARIANT_CONFIG[priceType]

    if (!variantConfig.variantId) {
      return new Response(
        JSON.stringify({ error: `Variant not configured for ${priceType}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create checkout via LemonSqueezy API
    const checkoutResponse = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email,
              custom: {
                user_id: user.id,
                price_type: priceType,
                credits: variantConfig.credits.toString(),
              },
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: storeId,
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: variantConfig.variantId,
              },
            },
          },
        },
      }),
    })

    if (!checkoutResponse.ok) {
      const errorData = await checkoutResponse.text()
      console.error('LemonSqueezy error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const checkoutData = await checkoutResponse.json()
    const checkoutUrl = checkoutData.data?.attributes?.url

    if (!checkoutUrl) {
      return new Response(
        JSON.stringify({ error: 'No checkout URL returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        url: checkoutUrl,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Checkout error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

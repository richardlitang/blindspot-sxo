// Supabase Edge Function: /lemonsqueezy-webhook
// Handles LemonSqueezy webhook events for payments and subscriptions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
}

interface WebhookPayload {
  meta: {
    event_name: string
    custom_data?: {
      user_id?: string
      price_type?: string
      credits?: string
    }
  }
  data: {
    id: string
    type: string
    attributes: {
      status?: string
      first_order_item?: {
        variant_id: number
      }
      // Order attributes
      total?: number
      // Subscription attributes
      product_id?: number
      variant_id?: number
      customer_id?: number
      ends_at?: string | null
      renews_at?: string | null
    }
  }
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret)
  const digest = hmac.update(payload).digest('hex')
  return digest === signature
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const webhookSecret = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET')

    if (!webhookSecret) {
      console.error('Missing LemonSqueezy webhook secret')
      return new Response('Webhook not configured', { status: 500 })
    }

    // Get the signature from headers
    const signature = req.headers.get('x-signature')
    if (!signature) {
      return new Response('Missing signature', { status: 400 })
    }

    // Get raw body
    const body = await req.text()

    // Verify webhook signature
    if (!verifySignature(body, signature, webhookSecret)) {
      console.error('Webhook signature verification failed')
      return new Response('Invalid signature', { status: 400 })
    }

    const payload: WebhookPayload = JSON.parse(body)

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const eventName = payload.meta.event_name
    const customData = payload.meta.custom_data

    console.log('Processing webhook event:', eventName)

    switch (eventName) {
      // One-time payment completed (Builder Pack)
      case 'order_created': {
        const userId = customData?.user_id
        const priceType = customData?.price_type
        const credits = parseInt(customData?.credits || '0', 10)

        if (userId && priceType === 'builder' && credits > 0) {
          // Add credits to user's balance
          const { data: profile } = await supabase
            .from('profiles')
            .select('credits_balance')
            .eq('id', userId)
            .single()

          const currentCredits = profile?.credits_balance || 0

          await supabase
            .from('profiles')
            .update({
              credits_balance: currentCredits + credits,
              tier: 'builder',
              lemonsqueezy_customer_id: payload.data.attributes.customer_id?.toString(),
            })
            .eq('id', userId)

          console.log(`Added ${credits} credits to user ${userId}`)
        }

        // Handle subscription order (first payment for Agency)
        if (userId && priceType === 'agency') {
          await supabase
            .from('profiles')
            .update({
              tier: 'agency',
              credits_balance: 9999, // Unlimited represented as high number
              lemonsqueezy_customer_id: payload.data.attributes.customer_id?.toString(),
            })
            .eq('id', userId)

          console.log(`Upgraded user ${userId} to agency tier`)
        }
        break
      }

      // Subscription created
      case 'subscription_created': {
        const userId = customData?.user_id

        if (userId) {
          await supabase
            .from('profiles')
            .update({
              tier: 'agency',
              credits_balance: 9999,
              lemonsqueezy_subscription_id: payload.data.id,
            })
            .eq('id', userId)

          console.log(`Created agency subscription for user ${userId}`)
        }
        break
      }

      // Subscription renewed (monthly payment)
      case 'subscription_payment_success': {
        // Find user by subscription ID
        const subscriptionId = payload.data.id

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('lemonsqueezy_subscription_id', subscriptionId)
          .single()

        if (profile) {
          // Ensure they stay on agency tier
          await supabase
            .from('profiles')
            .update({
              tier: 'agency',
              credits_balance: 9999,
            })
            .eq('id', profile.id)

          console.log(`Renewed agency subscription for user ${profile.id}`)
        }
        break
      }

      // Subscription cancelled or expired
      case 'subscription_cancelled':
      case 'subscription_expired': {
        const subscriptionId = payload.data.id

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('lemonsqueezy_subscription_id', subscriptionId)
          .single()

        if (profile) {
          // Downgrade to free tier
          await supabase
            .from('profiles')
            .update({
              tier: 'free',
              credits_balance: 0,
              lemonsqueezy_subscription_id: null,
            })
            .eq('id', profile.id)

          console.log(`Downgraded user ${profile.id} to free tier`)
        }
        break
      }

      // Payment failed
      case 'subscription_payment_failed': {
        const subscriptionId = payload.data.id

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('lemonsqueezy_subscription_id', subscriptionId)
          .single()

        if (profile) {
          console.log(`Payment failed for user ${profile.id} - awaiting retry or cancellation`)
          // LemonSqueezy will retry or eventually cancel
        }
        break
      }

      // Order refunded
      case 'order_refunded': {
        const userId = customData?.user_id
        const credits = parseInt(customData?.credits || '0', 10)

        if (userId && credits > 0) {
          // Remove credits
          const { data: profile } = await supabase
            .from('profiles')
            .select('credits_balance')
            .eq('id', userId)
            .single()

          const currentCredits = profile?.credits_balance || 0
          const newCredits = Math.max(0, currentCredits - credits)

          await supabase
            .from('profiles')
            .update({
              credits_balance: newCredits,
              tier: newCredits > 0 ? 'builder' : 'free',
            })
            .eq('id', userId)

          console.log(`Refunded ${credits} credits from user ${userId}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${eventName}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Webhook handler failed', { status: 500 })
  }
})

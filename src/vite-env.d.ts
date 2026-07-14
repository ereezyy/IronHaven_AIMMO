/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_XAI_API_KEY?: string;
  readonly VITE_GROK_API_KEY?: string;
  /** Stripe Payment Link / Checkout URL for Iron Haven Pass ($1.99/wk). */
  readonly VITE_STRIPE_PAYMENT_LINK?: string;
  readonly VITE_STRIPE_CHECKOUT_URL?: string;
  readonly VITE_STRIPE_PASS_URL?: string;
  readonly VITE_STRIPE_PASS_API?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_XAI_API_KEY?: string;
  readonly VITE_GROK_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

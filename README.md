# BanPum Admin

BanPum ecommerce operations platform.

## Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- Supabase SSR
- Shopify integration (to be connected later)

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add the BanPum Supabase project credentials.

## Architecture

Shopify = customer-facing commerce and checkout.

Supabase + BanPum Admin = physical inventory, receiving, QR locations, operations, returns, commissions and audit.

Shopify will be connected after the store account is ready.

## Deployment

This repository is connected to the BanPum Vercel project.

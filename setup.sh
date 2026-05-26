#!/bin/bash
# DJ KJ Booking App — one-time setup script
# Run this locally once after cloning the repo.
# Requires a .env file with all credentials (see .env.example).
set -e

if [ ! -f .env ]; then
  echo "❌ .env file not found. Copy .env.example and fill in your values first."
  exit 1
fi

# Load .env
export $(grep -v '^#' .env | xargs)

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ SUPABASE_ACCESS_TOKEN is not set in .env"
  echo "   Get it from: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

export SUPABASE_ACCESS_TOKEN

PROJECT_REF=$(echo "$VITE_SUPABASE_URL" | sed 's|https://||' | sed 's|\.supabase\.co.*||')
echo "▶ Project ref: $PROJECT_REF"

echo "▶ Linking Supabase project..."
npx supabase link --project-ref "$PROJECT_REF"

echo "▶ Running database migration..."
npx supabase db push

echo "▶ Setting edge function secrets..."
npx supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  RESEND_API_KEY="$RESEND_API_KEY" \
  HUSBAND_EMAIL="dazzlindezigns@gmail.com" \
  VITE_APP_URL="$VITE_APP_URL"

echo "▶ Deploying send-email function..."
npx supabase functions deploy send-email --no-verify-jwt

echo "▶ Deploying generate-contract function..."
npx supabase functions deploy generate-contract --no-verify-jwt

echo ""
echo "✅ Done! Supabase is fully set up."
echo "   Next: deploy to Vercel and add your env vars from .env there."

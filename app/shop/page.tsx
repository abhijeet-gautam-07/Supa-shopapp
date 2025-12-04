import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import ShopUI, { Product, CartItem } from './shop-ui';
import { getCart } from './actions';

// Ensure the page is dynamic so it checks auth cookies on every request
export const dynamic = 'force-dynamic';

// Helper: Create a Supabase Client for Server Components
async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Ignored in Server Components (Read-Only)
          }
        },
      },
    }
  );
}

export default async function ShopPage() {
  const supabase = await createClient();

  // 1. Get User (Server Side Source of Truth)
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Get All Products
  const { data: rawProducts } = await supabase
    .from('product')
    .select('*')
    .order('i_id', { ascending: true });

  // FIX: Convert BigInt IDs to Number to avoid "Digest" serialization error
  const products = (rawProducts || []).map((p) => ({
    ...p,
    i_id: Number(p.i_id),
    price: Number(p.price)
  }));

  // 3. Get Cart
  // We call our Server Action directly. It handles the logic of 
  // "Is this a Guest Cookie cart?" OR "Is this a User DB cart?"
  // and returns safe Numbers instead of BigInts.
  const cart = await getCart();

  // 4. Pass everything to the Client UI
  return (
    <ShopUI 
      initialUser={user} 
      initialProducts={(products as Product[]) || []} 
      initialCart={(cart as unknown as CartItem[]) || []} 
    />
  );
}
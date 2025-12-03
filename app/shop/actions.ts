'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// 1. Create Client with Guest Header Support
async function createClient(guestId?: string) {
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
            // Ignored
          }
        },
      },
      // --- CRITICAL FIX FOR GUEST ACCESS ---
      // This header MUST match what the SQL Policy is looking for
      global: {
        headers: guestId ? { 'x-guest-id': guestId } : {}
      }
    }
  );
}

// 2. Determine Owner
async function getCartOwner() {
  const cookieStore = await cookies();
  
  // Check User
  // We use a basic client here just to check auth status
  const supabaseAuth = await createClient(); 
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (user) {
    return { type: 'user', id: user.id };
  }

  // Check Guest
  let guestId = cookieStore.get('guest_cart_id')?.value;
  
  // If no guest cookie exists, generate one and set it
  if (!guestId) {
    guestId = crypto.randomUUID();
    cookieStore.set('guest_cart_id', guestId, { 
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true, 
      path: '/' 
    }); 
  }

  return { type: 'guest', id: guestId };
}

// --- ACTIONS ---

export async function getCart() {
  const owner = await getCartOwner();
  
  // Pass guest ID to client creator if needed so RLS allows reading
  const supabase = await createClient(owner.type === 'guest' ? owner.id : undefined);

  const query = supabase
    .from('cart_items')
    .select('*, product(*)') // Join product table to get details
    .order('created_at');

  if (owner.type === 'user') {
    query.eq('user_id', owner.id);
  } else {
    query.eq('guest_id', owner.id);
  }

  const { data, error } = await query;
  
  if (error) {
    return [];
  }
  
  return (data || []).map(item => ({
    ...item.product,
    quantity: item.quantity,
    cart_item_id: item.id 
  }));
}

export async function addToCart(productId: number) {
  const owner = await getCartOwner();
  
  // Pass guest ID to client creator so RLS allows the insert
  const supabase = await createClient(owner.type === 'guest' ? owner.id : undefined);

  const payload: any = { 
    product_id: productId, 
    quantity: 1 
  };
  
  if (owner.type === 'user') payload.user_id = owner.id;
  else payload.guest_id = owner.id;

  const { error } = await supabase.from('cart_items').insert(payload);
  
  if (error) console.error("Add Cart Error:", error);
  
  revalidatePath('/shop');
}

export async function removeFromCart(cartItemId: number) {
  const owner = await getCartOwner();
  const supabase = await createClient(owner.type === 'guest' ? owner.id : undefined);
  
  await supabase.from('cart_items').delete().eq('id', cartItemId);
  revalidatePath('/shop');
}

export async function checkout() {
  const owner = await getCartOwner();
  const supabase = await createClient(owner.type === 'guest' ? owner.id : undefined);
  
  let query = supabase.from('cart_items').delete();
  
  if (owner.type === 'user') {
    query = query.eq('user_id', owner.id);
  } else {
    query = query.eq('guest_id', owner.id);
  }
  
  const { error } = await query;
  if (error) console.error("Checkout Error:", error);
  
  revalidatePath('/shop');
}
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// 1. Create Client
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
      global: {
        headers: guestId ? { 'x-guest-id': guestId } : {}
      }
    }
  );
}

// 2. Helper: Determine Owner (Safe for Read-Only calls)
async function getCartOwner(createIfMissing = false) {
  const cookieStore = await cookies();
  
  // Check User
  const supabase = await createClient(); 
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return { type: 'user', id: user.id };
  }

  // Check Guest
  let guestId = cookieStore.get('guest_cart_id')?.value;
  
  // If no guest cookie exists...
  if (!guestId) {
    if (createIfMissing) {
      // ONLY set cookie if we are performing a write action (addToCart)
      guestId = crypto.randomUUID();
      cookieStore.set('guest_cart_id', guestId, { 
        maxAge: 60 * 60 * 24 * 30, 
        httpOnly: true, 
        path: '/' 
      }); 
    } else {
      // If reading, just return null so we don't crash the page render
      return null;
    }
  }

  return { type: 'guest', id: guestId };
}

// --- ACTIONS ---

export async function getCart() {
  // Pass FALSE so we don't try to set cookies during page render
  const owner = await getCartOwner(false);
  
  // If no owner (Guest with no cookie yet), return empty cart
  if (!owner) return [];

  const supabase = await createClient(owner.type === 'guest' ? owner.id : undefined);

  const query = supabase
    .from('cart_items')
    .select('*, product(*)')
    .order('created_at');

  if (owner.type === 'user') {
    query.eq('user_id', owner.id);
  } else {
    query.eq('guest_id', owner.id);
  }

  const { data, error } = await query;
  
  if (error) return [];
  
  // FIX: Convert BigInts to Numbers to prevent "Digest" error
  return (data || []).map(item => ({
    ...item.product,
    i_id: Number(item.product.i_id), // Convert Product ID
    price: Number(item.product.price),
    quantity: item.quantity,
    cart_item_id: Number(item.id) // Convert Cart Item ID
  }));
}

export async function addToCart(productId: number) {
  // Pass TRUE because we need to create a guest session now
  const owner = await getCartOwner(true);
  
  if (!owner) return; // Should not happen with true

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
  const owner = await getCartOwner(false);
  if (!owner) return;

  const supabase = await createClient(owner.type === 'guest' ? owner.id : undefined);
  await supabase.from('cart_items').delete().eq('id', cartItemId);
  revalidatePath('/shop');
}

export async function checkout() {
  const owner = await getCartOwner(false);
  if (!owner) return;

  const supabase = await createClient(owner.type === 'guest' ? owner.id : undefined);
  
  let query = supabase.from('cart_items').delete();
  if (owner.type === 'user') query = query.eq('user_id', owner.id);
  else query = query.eq('guest_id', owner.id);
  
  await query;
  revalidatePath('/shop');
}

// Debugger Action
export async function getDebugInfo() {
  const cookieStore = await cookies();
  const guestId = cookieStore.get('guest_cart_id')?.value || 'No Cookie';
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rawItems } = await supabase.from('cart_items').select('id, product_id, user_id, guest_id');

  // Convert BigInts here too for the debugger
  const safeItems = rawItems?.map(i => ({...i, id: Number(i.id)})) || [];

  return {
    serverGuestCookie: guestId,
    serverUserId: user?.id || 'Not Logged In',
    cartItemsSnapshot: safeItems
  };
}
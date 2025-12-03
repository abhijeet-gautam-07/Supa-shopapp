'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Helper: Create Supabase Client
async function createClient() {
  const cookieStore = await cookies()
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
    }
  )
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  // 1. Get Credentials
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 2. Sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return redirect('/login?error=Could not authenticate user')
  }

  // 3. --- MERGE GUEST CART LOGIC ---
  const cookieStore = await cookies()
  const guestId = cookieStore.get('guest_cart_id')?.value

  if (guestId) {
    console.log(`Attempting merge for Guest: ${guestId} -> User: ${data.user.id}`)
    
    // Explicitly pass the 'target_user_id' we just got from auth
    // This bypasses the issue where auth.uid() might not be ready in the RPC context yet
    const { error: mergeError } = await supabase.rpc('merge_guest_cart', { 
      guest_cart_id: guestId,
      target_user_id: data.user.id 
    })

    if (mergeError) {
      console.error("Cart Merge Error:", mergeError)
    } else {
      console.log("Merge Success. Deleting Guest Cookie.")
      // If successful, delete the guest cookie so we start fresh next time
      cookieStore.delete('guest_cart_id')
    }
  }
  // ------------------------------

  // 4. Redirect
  revalidatePath('/shop', 'page') 
  redirect('/shop') 
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return redirect('/register?error=Could not create user')
  }

  revalidatePath('/shop', 'page')
  redirect('/shop')
}

export async function loginWithGoogle() {
  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    console.error(error)
    return redirect('/login?error=OAuth failed')
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  revalidatePath('/shop', 'page')
  redirect('/shop')
}
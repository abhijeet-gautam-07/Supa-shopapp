import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signout } from '@/app/auth/actions'

export default async function Dashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mb-4">Welcome, {user.email}</p>
      
      {/* We use a form to invoke the Server Action */}
      <form action={signout}>
        <button 
          type="submit"
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
        >
          Sign Out
        </button>
      </form>
    </div>
  )
}
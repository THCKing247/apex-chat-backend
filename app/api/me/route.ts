import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error in /api/me:', authError.message)
      return NextResponse.json({ error: 'Unauthorized', details: authError.message }, { status: 401 })
    }

    if (!user) {
      console.error('No user found in /api/me')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For chatbot portal, we can add additional checks here if needed
    // For now, if user is authenticated and not suspended, they have access
    // You can add role-based checks here if chatbot access should be restricted

    const clientName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Client'

    return NextResponse.json({
      client: {
        id: user.id,
        email: user.email,
        name: clientName,
      },
    })
  } catch (error) {
    console.error('Error fetching user data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


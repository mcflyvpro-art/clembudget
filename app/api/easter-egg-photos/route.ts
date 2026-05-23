import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const BUCKET = 'easter-egg-photos'
const PHOTOS_PER_DAY = 5

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function todayStr() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date())
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET() {
  const supabase = getSupabase()
  const today = todayStr()

  const { data: state, error: stateErr } = await supabase
    .from('easter_egg_state')
    .select('*')
    .eq('id', 1)
    .single()

  if (stateErr) return NextResponse.json({ error: stateErr.message }, { status: 500 })

  if (state.today_date === today && state.today_photos?.length > 0) {
    return NextResponse.json({ photos: state.today_photos })
  }

  const { data: files, error: listErr } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } })

  if (listErr || !files?.length) {
    return NextResponse.json({ error: 'Bucket vide ou inaccessible' }, { status: 500 })
  }

  const allUrls = files.map(
    (f) => supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl
  )

  let queue: string[] = state.remaining_queue ?? []
  let todayPhotos: string[]
  let newQueue: string[]

  if (queue.length >= PHOTOS_PER_DAY) {
    todayPhotos = queue.slice(0, PHOTOS_PER_DAY)
    newQueue = queue.slice(PHOTOS_PER_DAY)
  } else {
    const remaining = [...queue]
    const needed = PHOTOS_PER_DAY - remaining.length
    const remainingSet = new Set(remaining)
    const freshPool = shuffle(allUrls.filter((u) => !remainingSet.has(u)))
    todayPhotos = [...remaining, ...freshPool.slice(0, needed)]
    newQueue = freshPool.slice(needed)
  }

  if (newQueue.length === 0) newQueue = shuffle(allUrls)

  await supabase
    .from('easter_egg_state')
    .update({ remaining_queue: newQueue, today_photos: todayPhotos, today_date: today })
    .eq('id', 1)

  return NextResponse.json({ photos: todayPhotos })
}

export async function POST() {
  const supabase = getSupabase()

  const { data: files, error } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 1000 })

  if (error || !files?.length) {
    return NextResponse.json({ error: error?.message ?? 'Bucket vide' }, { status: 400 })
  }

  const allUrls = files.map(
    (f) => supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl
  )

  const shuffled = shuffle(allUrls)

  const { error: updateErr } = await supabase
    .from('easter_egg_state')
    .update({ remaining_queue: shuffled, today_photos: [], today_date: null })
    .eq('id', 1)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ initialized: true, total: allUrls.length })
}

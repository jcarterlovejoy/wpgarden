import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xrzhzhersojjxpmjrnro.supabase.co'
const supabaseKey = 'sb_publishable_f1vn3a0HvbhhIC911ceZhA_ihMZwUQh'

export const supabase = createClient(supabaseUrl, supabaseKey)
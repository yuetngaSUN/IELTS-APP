import { createClient } from '@supabase/supabase-js'

// 你的项目真实 URL
const supabaseUrl = 'https://fpprpdrfnmrinbudomhh.supabase.co'

// 你的最新版 Publishable API key
const supabaseKey = 'sb_publishable_9nlyFXEMXJDAxRVjJPxFtA_51LzJm4A'

export const supabase = createClient(supabaseUrl, supabaseKey)
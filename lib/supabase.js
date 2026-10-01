import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ikzlugxmziugrzxmzuqz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlremx1Z3hteml1Z3J6eG16dXF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODAwNzgsImV4cCI6MjEwNTU1NjA3OH0.NAwmImPpZNcQIlSz4_5TxIKFWuiMY4i8yfqhf3ukvFE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const STORAGE_BUCKET = "bildirim-fotograflari";

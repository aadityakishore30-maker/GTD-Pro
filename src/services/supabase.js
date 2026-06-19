import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ifbjsogqyyhczgiuwnbb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmYmpzb2dxeXloY3pnaXV3bmJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDg5NzIsImV4cCI6MjA5NzAyNDk3Mn0.YL1a464FY3Xb6Wq_PkWlUSmj3_E-hc5kVs-5zOSUXis";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
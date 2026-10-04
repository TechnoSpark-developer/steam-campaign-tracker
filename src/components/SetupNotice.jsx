// Shown instead of the app when .env has not been filled in yet, so a fresh
// clone explains what is missing rather than showing a blank page.
export default function SetupNotice() {
  return (
    <section className="card">
      <h2>Setup needed</h2>
      <p className="form-message form-error" role="alert">
        Supabase is not configured. Copy .env.example to .env, fill in your
        project URL and publishable key, then restart the dev server.
      </p>
    </section>
  )
}

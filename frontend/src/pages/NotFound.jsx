import { Link } from 'react-router-dom'
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#000D1A] flex flex-col items-center justify-center text-center px-4">
      <p className="text-pyre-gold font-display font-bold text-6xl mb-4">404</p>
      <h1 className="text-white text-xl font-semibold mb-2">Page not found</h1>
      <p className="text-pyre-muted text-sm mb-8">This page doesn't exist or you don't have access.</p>
      <Link to="/dashboard" className="btn-primary">Go to dashboard</Link>
    </div>
  )
}

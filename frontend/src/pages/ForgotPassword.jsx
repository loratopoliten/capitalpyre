import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../utils/api'

export default function ForgotPassword() {
  const { register, handleSubmit } = useForm()
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (data) => {
    setLoading(true)
    await api.post('/auth/forgot-password', data).catch(() => {})
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#000D1A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-display font-bold text-lg tracking-wide block mb-10">
          CAPITAL <span className="text-pyre-gold">PYRE</span>
        </Link>
        <h1 className="font-display font-bold text-2xl text-white mb-1">Reset password</h1>
        <p className="text-sm text-pyre-muted mb-8">Enter your email and we'll send a reset link.</p>
        {sent ? (
          <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 text-sm text-green-300">
            If that email exists, a reset link has been sent. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit(submit)} className="space-y-4">
            <input {...register('email')} type="email" className="input" placeholder="you@example.com" />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <Link to="/login" className="text-xs text-pyre-muted hover:text-white mt-6 block text-center">← Back to login</Link>
      </div>
    </div>
  )
}

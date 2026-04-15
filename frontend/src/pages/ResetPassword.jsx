import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../utils/api'

export default function ResetPassword() {
  const [params]  = useSearchParams()
  const navigate  = useNavigate()
  const { register, handleSubmit } = useForm()
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async ({ password }) => {
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token: params.get('token'), password })
      navigate('/login?reset=1')
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#000D1A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-display font-bold text-lg tracking-wide block mb-10">
          CAPITAL <span className="text-pyre-gold">PYRE</span>
        </Link>
        <h1 className="font-display font-bold text-2xl text-white mb-1">Set new password</h1>
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <form onSubmit={handleSubmit(submit)} className="space-y-4 mt-6">
          <input {...register('password')} type="password" className="input" placeholder="New password (min. 8 chars)" />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Updating…' : 'Set password'}
          </button>
        </form>
      </div>
    </div>
  )
}

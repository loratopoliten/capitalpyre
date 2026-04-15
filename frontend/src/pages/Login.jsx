import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import api from '../utils/api'
import { setCredentials } from '../store/authSlice'

export default function Login() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { remember: false }
  })
  const [serverError, setServerError] = useState('')
  const [params]  = useSearchParams()
  const dispatch  = useDispatch()
  const navigate  = useNavigate()

  const login = useMutation({
    mutationFn: ({ email, password, remember }) =>
      api.post('/auth/login', { email, password, remember }),
    onSuccess: ({ data }, variables) => {
      dispatch(setCredentials({
        user:     data.user,
        token:    data.token,
        remember: variables.remember,
      }))
      navigate('/dashboard')
    },
    onError: (err) => {
      setServerError(err.response?.data?.message || 'Login failed. Please try again.')
    },
  })

  return (
    <div className="min-h-screen bg-[#000D1A] flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 h-14 border-b border-pyre-gold/20">
        <Link to="/" className="font-display font-bold text-lg tracking-wide">
          CAPITAL <span className="text-pyre-gold">PYRE</span>
        </Link>
        <Link to="/register" className="text-sm text-pyre-muted hover:text-white transition-colors">
          No account? Register →
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <h1 className="font-display font-bold text-2xl text-white mb-1">Welcome back</h1>
            <p className="text-sm text-pyre-muted">Sign in to your Capital Pyre account</p>
          </div>

          {/* Reset success banner */}
          {params.get('reset') && (
            <div className="bg-green-900/30 border border-green-500/30 rounded-lg px-4 py-3 text-sm text-green-300 mb-5">
              Password updated successfully. Please sign in.
            </div>
          )}

          {serverError && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300 mb-5">
              {serverError}
            </div>
          )}

          <form
            onSubmit={handleSubmit(d => { setServerError(''); login.mutate(d) })}
            className="space-y-4"
          >
            <div className="form-group">
              <label className="label">Email address</label>
              <input
                {...register('email', { required: 'Email is required' })}
                type="email"
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-pyre-gold hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                {...register('password', { required: 'Password is required' })}
                type="password"
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            {/* ── Remember Me ─────────────────────────── */}
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <div className="relative">
                <input
                  {...register('remember')}
                  type="checkbox"
                  className="sr-only peer"
                />
                {/* Custom toggle */}
                <div className="w-9 h-5 rounded-full bg-pyre-input border border-pyre-gold/20
                                peer-checked:bg-pyre-gold/80 peer-checked:border-pyre-gold
                                transition-all duration-200" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-pyre-muted
                                peer-checked:translate-x-4 peer-checked:bg-pyre-navy
                                transition-all duration-200" />
              </div>
              <div>
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  Remember me
                </span>
                <p className="text-[10px] text-pyre-muted leading-tight">
                  Stay signed in for 30 days
                </p>
              </div>
            </label>

            <button
              type="submit"
              disabled={login.isPending}
              className="btn-primary w-full mt-2"
            >
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-pyre-muted mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-pyre-gold hover:underline font-medium">
              Register
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}

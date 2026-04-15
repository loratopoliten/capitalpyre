import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import api from '../utils/api'
import { setCredentials } from '../store/authSlice'

const ROLES = [
  { value: 'entrepreneur', label: 'Entrepreneur',  desc: 'I have a business idea or startup seeking investment.' },
  { value: 'sme',          label: 'SME Owner',     desc: 'I run an established business seeking capital.' },
  { value: 'investor',     label: 'Investor',      desc: 'I want to discover and fund promising ventures.' },
]

export default function Register() {
  const [params]  = useSearchParams()
  const [role, setRole] = useState(params.get('role') || 'entrepreneur')
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm()
  const dispatch  = useDispatch()
  const navigate  = useNavigate()

  const reg = useMutation({
    mutationFn: (data) => api.post('/auth/register', { ...data, role }),
    onSuccess: ({ data }) => {
      dispatch(setCredentials({ user: data.user, token: data.token }))
      navigate('/dashboard')
    },
    onError: (err) => {
      setServerError(err.response?.data?.message || 'Registration failed. Please try again.')
    },
  })

  return (
    <div className="min-h-screen bg-[#000D1A] flex flex-col">
      <nav className="flex items-center justify-between px-8 h-14 border-b border-pyre-gold/20">
        <Link to="/" className="font-display font-bold text-lg tracking-wide">
          CAPITAL <span className="text-pyre-gold">PYRE</span>
        </Link>
        <Link to="/login" className="text-sm text-pyre-muted hover:text-white transition-colors">
          Have an account? Sign in →
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="font-display font-bold text-2xl text-white mb-1">Create your account</h1>
            <p className="text-sm text-pyre-muted">Join Capital Pyre and ignite your next chapter</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {ROLES.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  role === r.value
                    ? 'border-pyre-gold bg-pyre-gold/10 text-white'
                    : 'border-pyre-gold/20 bg-pyre-card text-pyre-muted hover:border-pyre-gold/40'
                }`}
              >
                <p className="text-xs font-semibold">{r.label}</p>
                <p className="text-[10px] mt-0.5 leading-tight opacity-80">{r.desc}</p>
              </button>
            ))}
          </div>

          {serverError && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300 mb-5">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(d => { setServerError(''); reg.mutate(d) })} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group mb-0">
                <label className="label">First name</label>
                <input {...register('firstname', { required: 'Required' })} className="input" placeholder="Kagiso" />
                {errors.firstname && <p className="text-xs text-red-400 mt-1">{errors.firstname.message}</p>}
              </div>
              <div className="form-group mb-0">
                <label className="label">Last name</label>
                <input {...register('lastname', { required: 'Required' })} className="input" placeholder="Molefe" />
                {errors.lastname && <p className="text-xs text-red-400 mt-1">{errors.lastname.message}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="label">Email address</label>
              <input
                {...register('email', { required: 'Email is required' })}
                type="email" className="input" placeholder="you@example.com"
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <input
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Must be at least 8 characters' },
                  pattern:   { value: /(?=.*[A-Z])(?=.*[0-9])/, message: 'Must include an uppercase letter and a number' },
                })}
                type="password" className="input" placeholder="Min. 8 chars, 1 uppercase, 1 number"
              />
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            {/* Role-specific extra fields */}
            {(role === 'entrepreneur' || role === 'sme') && (
              <div className="form-group">
                <label className="label">Business name</label>
                <input {...register('business_name')} className="input" placeholder="My Ventures (Pty) Ltd" />
              </div>
            )}

            {role === 'investor' && (
              <div className="form-group">
                <label className="label">Investor type</label>
                <select {...register('investor_type')} className="input">
                  <option value="angel">Angel Investor</option>
                  <option value="vc">Venture Capital</option>
                  <option value="institutional">Institutional</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={reg.isPending}
              className="btn-primary w-full mt-2"
            >
              {reg.isPending ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-xs text-pyre-muted mt-6">
            Already registered?{' '}
            <Link to="/login" className="text-pyre-gold hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

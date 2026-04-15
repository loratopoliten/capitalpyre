import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../utils/api'

const INDUSTRIES   = ['Technology','Agriculture','Manufacturing','Retail','Finance','Health','Education','Construction','Tourism','Mining','Other']
const REVENUE_BANDS = ['under-100k','100k-500k','500k-1m','1m-5m','above-5m']
const DOC_TYPES    = ['income_statement','balance_sheet','tax_clearance','cipa_certificate','bank_statement','business_plan','other']

export default function SmeProfile() {
  const qc = useQueryClient()
  const fileRef = useRef()
  const { register, handleSubmit, reset, watch, formState: { isDirty } } = useForm()
  const [docType, setDocType] = React.useState('income_statement')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['sme-profile'],
    queryFn: () => api.get('/sme/me').then(r => r.data.data),
  })

  useEffect(() => { if (profile) reset(profile) }, [profile, reset])

  const save = useMutation({
    mutationFn: (data) => api.put('/sme/me', data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['sme-profile'] }),
  })

  const uploadDoc = useMutation({
    mutationFn: (formData) => api.post('/sme/me/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sme-profile'] }),
  })

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('financial_doc', file)
    fd.append('doc_type', docType)
    uploadDoc.mutate(fd)
    e.target.value = ''
  }

  if (isLoading) return <p className="text-pyre-muted text-sm">Loading…</p>

  return (
    <div className="space-y-6 page-enter max-w-3xl">
      <div>
        <h1 className="section-title">SME Profile</h1>
        <p className="section-sub">Complete your profile to improve your Capital Readiness Score and get approved.</p>
      </div>

      <form onSubmit={handleSubmit(d => save.mutate(d))} className="card space-y-4">
        <p className="text-sm font-semibold text-white border-b border-pyre-gold/10 pb-3">Business Details</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">Business name</label>
            <input {...register('business_name')} className="input" />
          </div>
          <div className="form-group">
            <label className="label">CIPA Reg No. <span className="text-pyre-gold">↑ CRS</span></label>
            <input {...register('cipa_reg_no')} className="input" placeholder="BW-XXXXXXX" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">Industry</label>
            <select {...register('industry')} className="input">
              <option value="">Select…</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Revenue band (BWP) <span className="text-pyre-gold">↑ CRS</span></label>
            <select {...register('revenue_band')} className="input">
              <option value="">Select…</option>
              {REVENUE_BANDS.map(r => (
                <option key={r} value={r}>{r.replace(/-/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="form-group">
            <label className="label">Year established <span className="text-pyre-gold">↑ CRS</span></label>
            <input {...register('year_established')} type="number" placeholder="2018" className="input" />
          </div>
          <div className="form-group">
            <label className="label">Employees <span className="text-pyre-gold">↑ CRS</span></label>
            <input {...register('employee_count')} type="number" placeholder="12" className="input" />
          </div>
          <div className="form-group">
            <label className="label">Funding ask (BWP)</label>
            <input {...register('funding_ask')} type="number" className="input" />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Business description</label>
          <textarea {...register('description')} rows={3} className="input" placeholder="What does your business do?" />
        </div>

        <div className="form-group">
          <label className="label">Website</label>
          <input {...register('website')} className="input" placeholder="https://" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={save.isPending || !isDirty} className="btn-primary">
            {save.isPending ? 'Saving…' : 'Save profile'}
          </button>
          {save.isSuccess && <span className="text-xs text-green-400 self-center">Saved ✓</span>}
        </div>
      </form>

      {/* Document upload */}
      <div className="card space-y-4">
        <p className="text-sm font-semibold text-white border-b border-pyre-gold/10 pb-3">
          Financial Documents <span className="text-pyre-gold">↑ CRS</span>
        </p>

        <div className="flex gap-3 items-end">
          <div className="form-group mb-0 flex-1">
            <label className="label">Document type</label>
            <select value={docType} onChange={e => setDocType(e.target.value)} className="input">
              {DOC_TYPES.map(d => (
                <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadDoc.isPending}
            className="btn-secondary text-xs py-2.5"
          >
            {uploadDoc.isPending ? 'Uploading…' : '+ Upload file'}
          </button>
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.docx,.doc" onChange={handleFileUpload} />
        </div>

        {uploadDoc.isSuccess && (
          <p className="text-xs text-green-400">Document uploaded. Your CRS will be updated shortly.</p>
        )}

        {/* Uploaded docs list */}
        <div className="space-y-2">
          {(profile?.documents || []).map(doc => (
            <div key={doc.id} className="flex justify-between items-center text-xs py-2 border-b border-pyre-gold/5">
              <span className="text-pyre-muted capitalize">{doc.doc_type.replace(/_/g,' ')}</span>
              <span className="text-white truncate max-w-48">{doc.filename}</span>
              <span className="text-pyre-muted">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
            </div>
          ))}
          {!profile?.documents?.length && (
            <p className="text-xs text-pyre-muted">No documents uploaded yet. Each document improves your CRS score.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Need React import for useState
import React, { useState } from 'react'

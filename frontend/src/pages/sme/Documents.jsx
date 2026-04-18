import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../utils/api'

const DOC_TYPES = [
  { value: 'income_statement', label: 'Income Statement',  desc: 'Annual or monthly P&L',      points: 5 },
  { value: 'balance_sheet',    label: 'Balance Sheet',     desc: 'Assets, liabilities, equity', points: 5 },
  { value: 'tax_clearance',    label: 'Tax Clearance',     desc: 'BURS tax clearance cert',     points: 6 },
  { value: 'cipa_certificate', label: 'CIPA Certificate',  desc: 'Business registration cert',  points: 2 },
  { value: 'bank_statement',   label: 'Bank Statement',    desc: 'Last 6 months',               points: 4 },
  { value: 'business_plan',    label: 'Business Plan',     desc: 'Full business plan document',  points: 5 },
]

export default function SmeDocuments() {
  const qc      = useQueryClient()
  const fileRef = useRef()
  const [uploadType, setUploadType] = useState('income_statement')

  const { data: profile } = useQuery({
    queryKey: ['sme-profile'],
    queryFn: () => api.get('/sme/me').then(r => r.data.data),
  })

  const upload = useMutation({
    mutationFn: (fd) => api.post('/sme/me/documents', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sme-profile'] }),
  })

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('document', file)
    fd.append('doc_type', uploadType)
    upload.mutate(fd)
    e.target.value = ''
  }

  const uploaded = (profile?.documents || []).map(d => d.doc_type)

  return (
    <div className="space-y-6 page-enter max-w-3xl">
      <div>
        <h1 className="section-title">Financial Documents</h1>
        <p className="section-sub">Upload your business documents to improve your Capital Readiness Score and unlock more investor matches.</p>
      </div>

      <div className="card">
        <p className="text-sm font-semibold text-white mb-4">Upload a document</p>
        <div className="flex gap-3 items-end">
          <div className="form-group mb-0 flex-1">
            <label className="label">Document type</label>
            <select value={uploadType} onChange={e => setUploadType(e.target.value)} className="input">
              {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={upload.isPending}
            className="btn-primary text-sm">
            {upload.isPending ? 'Uploading…' : '+ Upload File'}
          </button>
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.docx,.xlsx,.jpg,.png" onChange={handleFile} />
        </div>
        {upload.isSuccess && <p className="text-xs text-green-400 mt-2">Document uploaded successfully.</p>}
        {upload.isError && <p className="text-xs text-red-400 mt-2">Upload failed. Please try again.</p>}
      </div>

      <div className="space-y-3">
        {DOC_TYPES.map(doc => {
          const isUploaded = uploaded.includes(doc.value)
          return (
            <div key={doc.value}
              className={`card flex items-center justify-between transition-colors
                ${isUploaded ? 'border-green-500/30 bg-green-900/10' : 'hover:border-pyre-gold/30'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  ${isUploaded ? 'bg-green-500/20 text-green-400' : 'bg-pyre-input text-pyre-muted'}`}>
                  {isUploaded ? '✓' : '+'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{doc.label}</p>
                  <p className="text-xs text-pyre-muted">{doc.desc}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xs font-semibold ${isUploaded ? 'text-green-400' : 'text-pyre-muted'}`}>
                  {isUploaded ? 'Uploaded ✓' : `+${doc.points} CRS pts`}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

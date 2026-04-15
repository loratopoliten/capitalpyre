import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { socket } from '../../utils/socket'
import api from '../../utils/api'
import { selectUser } from '../../store/authSlice'

export default function Messages() {
  const user   = useSelector(selectUser)
  const qc     = useQueryClient()
  const [activeThread, setActiveThread] = useState(null)
  const [newMsg, setNewMsg] = useState('')
  const [messages, setMessages] = useState([])
  const bottomRef = useRef()

  // My matches (to derive threads)
  const { data: matches = [] } = useQuery({
    queryKey: ['matches-for-msg'],
    queryFn: () => api.get('/matches?status=accepted').then(r => r.data.data),
  })

  const threads = matches
    .filter(m => m.status === 'accepted')
    .map(m => ({
      thread_id: String(m.id),
      label:     m.firm_name || `${m.firstname} ${m.lastname}`,
    }))

  // Load thread messages
  const { data: threadData, isLoading } = useQuery({
    queryKey: ['thread', activeThread],
    queryFn: () => api.get(`/messages/${activeThread}`).then(r => r.data.data),
    enabled: !!activeThread,
    onSuccess: (data) => setMessages(data),
  })

  // Socket.IO: listen for real-time messages in active thread
  useEffect(() => {
    if (!activeThread) return
    socket.emit('join_thread', activeThread)
    const handler = (msg) => setMessages(prev => [...prev, msg])
    socket.on('new_message', handler)
    return () => {
      socket.off('new_message', handler)
      socket.emit('leave_thread', activeThread)
    }
  }, [activeThread])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useMutation({
    mutationFn: ({ content }) => {
      const match = matches.find(m => String(m.id) === activeThread)
      // Determine receiver: the other party
      const receiver_id = user.id === match?.investor_user_id
        ? match?.target_user_id
        : match?.investor_user_id
      return api.post('/messages', {
        thread_id: activeThread,
        receiver_id: receiver_id || 1,
        content,
      })
    },
    onSuccess: ({ data }) => {
      setMessages(prev => [...prev, data.data])
      setNewMsg('')
    },
  })

  const handleSend = (e) => {
    e.preventDefault()
    if (!newMsg.trim() || !activeThread) return
    send.mutate({ content: newMsg.trim() })
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 rounded-xl overflow-hidden border border-pyre-gold/10 page-enter">

      {/* Thread list */}
      <aside className="w-56 flex-shrink-0 bg-pyre-navy border-r border-pyre-gold/10 flex flex-col">
        <div className="px-4 py-3 border-b border-pyre-gold/10">
          <p className="text-xs font-semibold text-pyre-muted uppercase tracking-wide">Conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="text-xs text-pyre-muted p-4 text-center">No accepted matches yet.</p>
          ) : (
            threads.map(t => (
              <button
                key={t.thread_id}
                onClick={() => { setActiveThread(t.thread_id); setMessages([]) }}
                className={`w-full text-left px-4 py-3 text-sm border-b border-pyre-gold/5 transition-colors
                  ${activeThread === t.thread_id
                    ? 'bg-pyre-blue text-white'
                    : 'text-pyre-muted hover:bg-pyre-blue/20 hover:text-white'}`}
              >
                <p className="font-medium truncate">{t.label}</p>
                <p className="text-[10px] opacity-60">Match #{t.thread_id}</p>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-[#0A1628]">
        {!activeThread ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-pyre-muted text-sm">Select a conversation to start messaging.</p>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <p className="text-pyre-muted text-xs text-center">Loading messages…</p>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.id
                  return (
                    <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm
                        ${isMe
                          ? 'bg-pyre-blue text-white rounded-br-sm'
                          : 'bg-pyre-card text-gray-100 rounded-bl-sm'}`}>
                        <p>{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-pyre-muted'}`}>
                          {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="border-t border-pyre-gold/10 p-3 flex gap-2">
              <input
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                className="input flex-1 text-sm"
                placeholder="Type a message…"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!newMsg.trim() || send.isPending}
                className="btn-primary px-4 text-xs"
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

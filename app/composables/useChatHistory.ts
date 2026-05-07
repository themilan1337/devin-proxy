import { isToday, isYesterday, subMonths } from 'date-fns'
import { useLocalStorage } from '@vueuse/core'

export interface LocalMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface LocalConversation {
  id: string
  title: string
  model: string
  messages: LocalMessage[]
  createdAt: string
  updatedAt: string
}

export function useChatHistory() {
  const storage = useLocalStorage<LocalConversation[]>('devin-proxy-chats', [], {
    initOnMounted: true
  })

  const conversations = computed(() =>
    [...storage.value].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  )

  const groups = computed(() => {
    const today: LocalConversation[] = []
    const yesterday: LocalConversation[] = []
    const lastWeek: LocalConversation[] = []
    const lastMonth: LocalConversation[] = []
    const older: Record<string, LocalConversation[]> = {}

    const oneWeekAgo = subMonths(new Date(), 0.25)
    const oneMonthAgo = subMonths(new Date(), 1)

    conversations.value.forEach((conv) => {
      const date = new Date(conv.createdAt)
      if (isToday(date)) {
        today.push(conv)
      } else if (isYesterday(date)) {
        yesterday.push(conv)
      } else if (date >= oneWeekAgo) {
        lastWeek.push(conv)
      } else if (date >= oneMonthAgo) {
        lastMonth.push(conv)
      } else {
        const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        if (!older[label]) older[label] = []
        older[label]!.push(conv)
      }
    })

    const result: Array<{ id: string; label: string; items: LocalConversation[] }> = []
    if (today.length) result.push({ id: 'today', label: 'Today', items: today })
    if (yesterday.length) result.push({ id: 'yesterday', label: 'Yesterday', items: yesterday })
    if (lastWeek.length) result.push({ id: 'last-week', label: 'Last week', items: lastWeek })
    if (lastMonth.length) result.push({ id: 'last-month', label: 'Last month', items: lastMonth })

    Object.keys(older)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .forEach((key) => {
        if (older[key]?.length) result.push({ id: key, label: key, items: older[key]! })
      })

    return result
  })

  function getConversation(id: string): LocalConversation | null {
    return storage.value.find(c => c.id === id) ?? null
  }

  function createConversation(id: string, model: string): LocalConversation {
    const now = new Date().toISOString()
    const conv: LocalConversation = {
      id,
      title: '',
      model,
      messages: [],
      createdAt: now,
      updatedAt: now
    }
    storage.value = [conv, ...storage.value]
    return conv
  }

  function addMessage(id: string, message: LocalMessage) {
    const idx = storage.value.findIndex(c => c.id === id)
    if (idx < 0) return
    const conv = storage.value[idx]!
    storage.value = [
      ...storage.value.slice(0, idx),
      { ...conv, messages: [...conv.messages, message], updatedAt: new Date().toISOString() },
      ...storage.value.slice(idx + 1)
    ]
  }

  function updateLastMessage(id: string, content: string) {
    const idx = storage.value.findIndex(c => c.id === id)
    if (idx < 0) return
    const conv = storage.value[idx]!
    const msgs = [...conv.messages]
    const last = msgs[msgs.length - 1]
    if (!last || last.role !== 'assistant') return
    msgs[msgs.length - 1] = { ...last, content }
    storage.value = [
      ...storage.value.slice(0, idx),
      { ...conv, messages: msgs, updatedAt: new Date().toISOString() },
      ...storage.value.slice(idx + 1)
    ]
  }

  function setTitle(id: string, title: string) {
    const idx = storage.value.findIndex(c => c.id === id)
    if (idx < 0) return
    const conv = storage.value[idx]!
    storage.value = [
      ...storage.value.slice(0, idx),
      { ...conv, title, updatedAt: new Date().toISOString() },
      ...storage.value.slice(idx + 1)
    ]
  }

  function deleteConversation(id: string) {
    storage.value = storage.value.filter(c => c.id !== id)
  }

  function renameConversation(id: string, title: string) {
    setTitle(id, title)
  }

  return {
    conversations,
    groups,
    getConversation,
    createConversation,
    addMessage,
    updateLastMessage,
    setTitle,
    deleteConversation,
    renameConversation
  }
}

const STORAGE_KEY = 'poprompt-prompts'

const Store = {
  data: { prompts: [] },
  _writeTimer: null,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        this.data = { prompts: [] }
        return this.data
      }
      this.data = JSON.parse(raw)
      if (!Array.isArray(this.data.prompts)) {
        this.data.prompts = []
      }
      this.data.prompts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      return this.data
    } catch (err) {
      console.error('Failed to load prompts:', err)
      this.data = { prompts: [] }
      return this.data
    }
  },

  save() {
    clearTimeout(this._writeTimer)
    this._writeTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
      } catch (err) {
        console.error('Failed to save prompts:', err)
        this._showQuotaError()
      }
    }, 150)
  },

  _showQuotaError() {
    const toast = document.createElement('div')
    toast.className = 'toast'
    toast.textContent = 'Storage full. Please delete some prompts.'
    const container = document.getElementById('toast-container')
    if (container) {
      container.appendChild(toast)
      setTimeout(() => {
        toast.classList.add('toast-out')
        toast.addEventListener('animationend', () => toast.remove())
      }, 3000)
    }
  },

  create(name, content, tags) {
    const now = new Date().toISOString()
    const prompt = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: name || 'Untitled Prompt',
      content: content || '',
      tags: tags || [],
      favorite: false,
      createdAt: now,
      updatedAt: now
    }
    this.data.prompts.unshift(prompt)
    this.save()
    return prompt
  },

  update(id, updates) {
    const idx = this.data.prompts.findIndex(p => p.id === id)
    if (idx === -1) return null
    this.data.prompts[idx] = {
      ...this.data.prompts[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    this.save()
    return this.data.prompts[idx]
  },

  remove(id) {
    const idx = this.data.prompts.findIndex(p => p.id === id)
    if (idx === -1) return false
    this.data.prompts.splice(idx, 1)
    this.save()
    return true
  },

  get(id) {
    return this.data.prompts.find(p => p.id === id) || null
  },

  search(query) {
    if (!query || !query.trim()) return this.data.prompts
    const q = query.toLowerCase().trim()
    return this.data.prompts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
    )
  },

  toggleFavorite(id) {
    const prompt = this.get(id)
    if (!prompt) return null
    return this.update(id, { favorite: !prompt.favorite })
  }
}
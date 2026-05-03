const Store = {
  data: { prompts: [] },
  _writeQueue: Promise.resolve(),

  async load() {
    try {
      const result = await window.api.getPrompts()
      this.data = result
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
    this._writeQueue = this._writeQueue.then(async () => {
      try {
        await window.api.savePrompts(this.data)
      } catch (err) {
        console.error('Failed to save prompts:', err)
      }
    })
    return this._writeQueue
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
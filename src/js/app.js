const App = {
  state: {
    selectedId: null,
    searchQuery: '',
    saveTimer: null,
    pendingDeleteId: null
  },

  elements: {},

  async init() {
    this.cacheElements()
    this.applyTheme()
    await Store.load()
    this.render()
    this.bindEvents()
    this.updateCount()
  },

  cacheElements() {
    const $ = (sel) => document.querySelector(sel)
    this.elements = {
      promptList: $('#prompt-list'),
      search: $('#search'),
      clearSearch: $('#btn-clear-search'),
      promptCount: $('#prompt-count'),
      emptyState: $('#empty-state'),
      editor: $('#editor'),
      titleInput: $('#prompt-title'),
      tagsInput: $('#prompt-tags'),
      contentArea: $('#prompt-content'),
      charCount: $('#char-count'),
      saveIndicator: $('#save-indicator'),
      btnCopy: $('#btn-copy'),
      btnFavorite: $('#btn-favorite'),
      btnDelete: $('#btn-delete'),
      btnNew: $('#btn-new'),
      btnNewEmpty: $('#btn-new-empty'),
      btnTheme: $('#btn-theme'),
      iconSun: $('#icon-sun'),
      iconMoon: $('#icon-moon'),
      confirmDialog: $('#confirm-dialog'),
      confirmMessage: $('#confirm-message'),
      confirmCancel: $('#confirm-cancel'),
      confirmDelete: $('#confirm-delete'),
      toastContainer: $('#toast-container')
    }
  },

  bindEvents() {
    const el = this.elements

    el.btnNew.addEventListener('click', () => this.createNew())
    el.btnNewEmpty.addEventListener('click', () => this.createNew())
    el.btnTheme.addEventListener('click', () => this.toggleTheme())
    el.search.addEventListener('input', () => this.onSearch())
    el.clearSearch.addEventListener('click', () => this.clearSearch())

    el.titleInput.addEventListener('input', () => this.onTitleChange())
    el.tagsInput.addEventListener('input', () => this.onTagsChange())
    el.contentArea.addEventListener('input', () => this.onContentChange())

    el.btnCopy.addEventListener('click', () => this.copyCurrent())
    el.btnFavorite.addEventListener('click', () => this.toggleFavorite())
    el.btnDelete.addEventListener('click', () => this.showDeleteConfirm())

    el.confirmCancel.addEventListener('click', () => this.hideConfirm())
    el.confirmDelete.addEventListener('click', () => this.confirmDelete())
    el.confirmDialog.addEventListener('click', (e) => {
      if (e.target === el.confirmDialog) this.hideConfirm()
    })

    document.addEventListener('keydown', (e) => this.onKeyDown(e))
  },

  onKeyDown(e) {
    const ctrl = e.ctrlKey || e.metaKey

    if (ctrl && e.key === 'n') {
      e.preventDefault()
      this.createNew()
    }
    if (ctrl && e.shiftKey && e.key === 'c') {
      e.preventDefault()
      this.copyCurrent()
    }
    if (e.key === 'Delete' && this.state.selectedId && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault()
      this.showDeleteConfirm()
    }
    if (ctrl && e.key === 'f') {
      e.preventDefault()
      this.elements.search.focus()
    }
    if (e.key === 'Escape') {
      if (!this.elements.confirmDialog.classList.contains('hidden')) {
        this.hideConfirm()
      } else if (document.activeElement === this.elements.search) {
        this.elements.search.blur()
        this.clearSearch()
      }
    }
  },

  render() {
    this.renderList()
    this.renderEditor()
  },

  renderList() {
    const prompts = Store.search(this.state.searchQuery)
    const el = this.elements.promptList

    if (prompts.length === 0) {
      el.innerHTML = `<div class="empty-state" style="padding:40px 20px;text-align:center;">
        <p style="font-size:13px;color:var(--text-muted);">${this.state.searchQuery ? 'No prompts match your search' : 'No prompts yet'}</p>
      </div>`
      return
    }

    el.innerHTML = prompts.map(p => {
      const preview = (p.content || '').replace(/\n/g, ' ').substring(0, 80)
      const date = this.formatDate(p.updatedAt)
      const fav = p.favorite ? '&#9733;' : ''
      const tagsHtml = (p.tags || []).slice(0, 3).map(t =>
        `<span class="prompt-card-tag">${this.esc(t)}</span>`
      ).join('')

      return `
        <div class="prompt-card ${p.id === this.state.selectedId ? 'active' : ''}" data-id="${p.id}">
          <div class="prompt-card-name">${this.esc(p.name)}${fav ? ` <span class="prompt-card-fav">${fav}</span>` : ''}</div>
          <div class="prompt-card-preview">${preview ? this.esc(preview) : '<span style="opacity:0.4;">Empty prompt...</span>'}</div>
          <div class="prompt-card-meta">
            ${tagsHtml}
            <span class="prompt-card-date">${date}</span>
          </div>
        </div>
      `
    }).join('')

    el.querySelectorAll('.prompt-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id
        this.selectPrompt(id)
      })
    })
  },

  renderEditor() {
    const el = this.elements
    const prompt = this.state.selectedId ? Store.get(this.state.selectedId) : null

    if (!prompt) {
      el.editor.classList.add('hidden')
      el.emptyState.classList.remove('hidden')
      return
    }

    el.editor.classList.remove('hidden')
    el.emptyState.classList.add('hidden')

    el.titleInput.value = prompt.name || ''
    el.tagsInput.value = (prompt.tags || []).join(', ')
    el.contentArea.value = prompt.content || ''

    if (prompt.favorite) {
      el.btnFavorite.classList.add('favorited')
    } else {
      el.btnFavorite.classList.remove('favorited')
    }

    this.updateCharCount()
    el.contentArea.focus()
  },

  selectPrompt(id) {
    this.state.selectedId = id
    this.render()
  },

  createNew(name, content) {
    const prompt = Store.create(
      name || '',
      content || '',
      []
    )
    this.state.selectedId = prompt.id
    this.state.searchQuery = ''
    this.elements.search.value = ''
    this.render()
    this.updateCount()
    this.elements.titleInput.focus()
    this.elements.titleInput.select()
  },

  onTitleChange() {
    if (!this.state.selectedId) return
    Store.update(this.state.selectedId, {
      name: this.elements.titleInput.value
    })
    this.refreshList()
    this.showSaving()
  },

  onTagsChange() {
    if (!this.state.selectedId) return
    const raw = this.elements.tagsInput.value
    const tags = raw.split(',').map(t => t.trim()).filter(Boolean)
    Store.update(this.state.selectedId, { tags })
    this.refreshList()
    this.showSaving()
  },

  onContentChange() {
    if (!this.state.selectedId) return
    this.updateCharCount()
    this.showSaving()
    clearTimeout(this.state.saveTimer)
    this.state.saveTimer = setTimeout(() => {
      Store.update(this.state.selectedId, {
        content: this.elements.contentArea.value
      })
      this.refreshList()
      this.showSaved()
    }, 300)
  },

  onSearch() {
    this.state.searchQuery = this.elements.search.value
    const hasQuery = this.state.searchQuery.length > 0
    this.elements.clearSearch.classList.toggle('visible', hasQuery)
    this.renderList()
  },

  clearSearch() {
    this.elements.search.value = ''
    this.state.searchQuery = ''
    this.elements.clearSearch.classList.remove('visible')
    this.renderList()
  },

  async copyCurrent() {
    if (!this.state.selectedId) return
    const prompt = Store.get(this.state.selectedId)
    if (!prompt) return
    try {
      await navigator.clipboard.writeText(prompt.content)
      this.showToast('Copied to clipboard')
    } catch (err) {
      const fallback = () => {
        const ta = document.createElement('textarea')
        ta.value = prompt.content
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        this.showToast('Copied to clipboard')
      }
      fallback()
    }
  },

  toggleFavorite() {
    if (!this.state.selectedId) return
    const updated = Store.toggleFavorite(this.state.selectedId)
    if (updated) {
      this.renderEditor()
      this.refreshList()
    }
  },

  showDeleteConfirm() {
    if (!this.state.selectedId) return
    const prompt = Store.get(this.state.selectedId)
    this.state.pendingDeleteId = this.state.selectedId
    this.elements.confirmMessage.textContent = `Are you sure you want to delete "${prompt.name}"? This cannot be undone.`
    this.elements.confirmDialog.classList.remove('hidden')
  },

  hideConfirm() {
    this.elements.confirmDialog.classList.add('hidden')
    this.state.pendingDeleteId = null
  },

  confirmDelete() {
    const id = this.state.pendingDeleteId
    if (!id) return
    Store.remove(id)
    this.hideConfirm()
    if (this.state.selectedId === id) {
      this.state.selectedId = null
      this.renderEditor()
    }
    this.refreshList()
    this.updateCount()
    this.showToast('Prompt deleted')
  },

  refreshList() {
    const scrollTop = this.elements.promptList.scrollTop
    this.renderList()
    this.elements.promptList.scrollTop = scrollTop
    this.updateCount()
  },

  updateCount() {
    const total = Store.data.prompts.length
    this.elements.promptCount.textContent = total === 0
      ? 'No prompts yet'
      : total === 1
        ? '1 prompt'
        : `${total} prompts`
  },

  updateCharCount() {
    const len = this.elements.contentArea.value.length
    this.elements.charCount.textContent = len === 1 ? '1 character' : `${len.toLocaleString()} characters`
  },

  showSaving() {
    const el = this.elements.saveIndicator
    el.textContent = 'Saving...'
    el.className = 'save-indicator saving'
  },

  showSaved() {
    const el = this.elements.saveIndicator
    el.textContent = 'Saved'
    el.className = 'save-indicator saved'
  },

  showToast(message) {
    const toast = document.createElement('div')
    toast.className = 'toast'
    toast.textContent = message
    this.elements.toastContainer.appendChild(toast)

    setTimeout(() => {
      toast.classList.add('toast-out')
      toast.addEventListener('animationend', () => toast.remove())
    }, 2200)
  },

  formatDate(iso) {
    const d = new Date(iso)
    const now = new Date()
    const diff = now - d
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  },

  getTheme() {
    return localStorage.getItem('poprompt-theme') || 'dark'
  },

  setTheme(theme) {
    localStorage.setItem('poprompt-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  },

  applyTheme() {
    const theme = this.getTheme()
    document.documentElement.setAttribute('data-theme', theme)
    this.updateThemeIcons(theme)
  },

  toggleTheme() {
    const current = this.getTheme()
    const next = current === 'dark' ? 'light' : 'dark'
    this.setTheme(next)
    this.updateThemeIcons(next)
  },

  updateThemeIcons(theme) {
    const el = this.elements
    if (!el.iconSun || !el.iconMoon) return
    if (theme === 'dark') {
      el.iconSun.classList.remove('hidden')
      el.iconMoon.classList.add('hidden')
    } else {
      el.iconSun.classList.add('hidden')
      el.iconMoon.classList.remove('hidden')
    }
  },

  esc(str) {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }
}

document.addEventListener('DOMContentLoaded', () => App.init())
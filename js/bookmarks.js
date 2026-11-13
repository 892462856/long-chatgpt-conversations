// Local bookmarks — stored in chrome.storage.local, one list per conversation.
const BookmarkStore = (() => {
  const prefix = 'bookmarks:'
  const storageKey = () => `${prefix}${location.hostname}:${getChatIdByLocation() || location.pathname}`
  const read = async () => (await chrome.storage.local.get(storageKey()))[storageKey()] || []
  const write = (list) => chrome.storage.local.set({ [storageKey()]: list })

  return Object.freeze({
    async list() {
      return (await read()).slice()
    },
    async add(item) {
      const saved = {
        ...item,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        ts: Date.now()
      }
      const list = await read()
      list.push(saved)
      await write(list)
      return saved
    },
    async remove(id) {
      const list = await read()
      const rest = list.filter(item => item.id !== id)
      if (rest.length === list.length) return false
      await write(rest)
      return true
    }
  })
})()

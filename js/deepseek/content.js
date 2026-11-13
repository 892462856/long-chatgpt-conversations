/*deepseek独特的地方
1.deepseek切换chat的问题：他不像chatgpt重新添加div，有时候会重用旧的div/Commant，导致MutationObserver监听到的removedNodes是空的。
              如果新的chat的列表数量刚好和上一个chat的数量一样，则MutationObserver基本不会触发。
解决：监听url的GUID，GUID改变，则TREE清空再重载
2.回复的URL：https://chat.deepseek.com/api/v0/chat/completion
       https://chat.deepseek.com/api/v0/chat/regenerate
*/

class Main_ds extends MainBase {
  static #selectors = Object.freeze({
    article: '[data-virtual-list-item-key]',
    markdown: '.ds-markdown', //'.ds-markdown--block',
    // chatInputId: 'chat-input'
  })

  updateSelectors(selectors) {
    if (!selectors) return

    Main_ds.#selectors = Object.freeze({ ...Main_ds.#selectors, ...selectors })
  }

  constructor() {
    super()

    // this.#listenerUrlChange()
  }
  getMainEl() {
    return document.body
  }
  getArticleParent() {
    const articleParent = this.el?.querySelector(Main_ds.#selectors.article)?.parentElement
    articleParent?.setAttribute(MainBase.attrs.articleParent, '')
    this.setScroller(articleParent)
    return articleParent

    // let articleParent = this.el?.querySelector('.ds-markdown')
    // while (articleParent) {
    //   if (articleParent.parentElement.matches('.ds-scroll-area')) break
    //   articleParent = articleParent.parentElement
    // }
    // articleParent?.setAttribute(MainBase.attrs.articleParent, '')
    // this.setScroller(articleParent)
    // return articleParent
  }
  setMarks() {
    if (!this.el || !this.el.isConnected) return

    this.el.setAttribute(MainBase.attrs.main, '')
    this.el.parentElement?.previousElementSibling?.setAttribute(MainBase.attrs.top, '')
    // document.getElementById(Main_ds.#selectors.chatInputId)?.closest(`[${MainBase.attrs.main}] > div > div`)?.setAttribute(MainBase.attrs.bottom,'')
  }//设置main/top/bottom元素的标记
  #listenerUrlChange() {
    let chatId
    super.listenerUrlChange((data) => {
      console.log('listenerUrlChange', data)
      let newChatId = data.url.split('#')[0].split('/').filter(t => t).pop()
      if (!isGUID(newChatId)) newChatId = undefined
      if (newChatId !== chatId) {
        chatId = newChatId
        this.launchChangeEvent({ type: 'load', articleParent: this.getArticleParent() })
      }
    })//以前deepseek重加载页面时用的，现在deepseek也使用了无刷新，所以不需要了。
  }//监听chatId的改变（来自URL）
  // #isArticle(el){
  //   // return el.tagName.toUpperCase() === selectors.article.toUpperCase() chatgpt.com
  //   return el.querySelector('.ds-markdown--block')?.parentElement === el //deeseek.com
  // }
  // #getArticleByDescendant(descendant){
  //   // return el.closest(selectors.article) chatgpt.com
  //   return descendant.closest('.ds-markdown--block')?.parentElement //deeseek.com
  // }

  async generateMarkdown(options, chatId) {
    //const text = await navigator.clipboard.readText();
    return await super.generateMarkdown(options)

    const chatData = await new Promise((resolve, reject) => {
      const request = indexedDB.open('deepseek-chat')
      request.onsuccess = (event) => {
        const db = event.target.result
        const tx = db.transaction(['history-message'], 'readonly')
        const store = tx.objectStore('history-message')
        const getData = store.get(chatId)

        getData.onsuccess = () => {
          console.log(`IndexedDB数据(${chatId}):`, getData.result)
          resolve(getData.result)
        }
      }

      request.onerror = (event) => {
        console.log('IndexedDB错误:', event.target.error)
        reject(event.target.error)
      }
    })

    if(!chatData) return await super.generateMarkdown(options)

    const messages = chatData.data.chat_messages.sort((a,b)=>a.message_id - b.message_id)

    const mds = options.map(async ({ id }) => {
      const index = id * 2
      const queryMd = messages[index].con
      return [queryMd, replyMd, '******']
    }).flat().filter(t => t)

    return mds.join('\n\n')
  }
}

window.addEventListener('load', () => {
  const main = new Main_ds()

  Floater.TreeCreator = TreeCreator_ds
  Floater.undisplaySelectors = `.md-code-block-banner-wrap,
              .md-code-block-banner,
              .md-code-block-banner-lite,
              [role="button"],
              .ds-button,
              .ds-flex,
              button` //导出时，要移除的元素，这些都是按钮
  Floater.create(main, undefined)//undefined：不显示new chat按钮

  // chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  //   if (message.type === 'logout') {
  //     location.reload()
  //   }
  // })
})

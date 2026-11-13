class MainGemini extends MainBase {
  static #selectors = Object.freeze({
    articleParent: [
      { type: 'query', para: 'infinite-scroller[data-test-id="chat-history-container"]' }
    ]
  })

  updateSelectors(selectors) {
    if (!selectors) return

    MainGemini.#selectors = Object.freeze({ ...MainGemini.#selectors, ...selectors })
  }

  constructor() {
    super(false)
    this.#listenerUrlChange()
  }
  getMainEl() {
    return document.body
  }
  getArticleParent() {
    return super.getArticleParent(MainGemini.#selectors.articleParent)
  }
  #listenerUrlChange() {
    super.listenerUrlChange((data) => {
      const baseUrl = 'https://gemini.google.com'
      const excludeds = ['apps', 'saved-info', 'sharing', 'search', 'gems/view'].map(t => (`${baseUrl}/${t}`))

      if (excludeds.some(url => data.url.startsWith(url))) {
        document.body.setAttribute(MainBase.attrs.hideFloater, '')
      } else if (data.url.startsWith('https://gemini.google.com/app/')) {//是聊天页面
        document.body.removeAttribute(MainBase.attrs.hideFloater)
      }
    })
  }//监听URL改变（显示/隐藏floater）

  async generateMarkdown(options) {
    const mds = options.map(({ li, name }) => {
      const ref = li.__ref?.deref()//?.cloneNode(true) 不能用cloneNode，因为样式(如：换行)丢失
      if (!ref) return []

      const query = ref.querySelector('user-query')
      query.querySelector('.cdk-visually-hidden')?.remove() //移除“我说”

      const queryMd = super._generateQueryMarkdonw(query, name)
      const replyMd = super._generateMarkdownByElement(ref.querySelector('model-response'))
      return [queryMd, replyMd, '******']
    }).flat()

    return mds.join('\n\n')
  }
}

window.addEventListener('load', () => {
  const main = new MainGemini()

  const getNewButton = () => document.querySelector('[data-test-id="new-chat-button"]')?.querySelector('button') //獲取 “新對話”按鈕不可靠，chatgpa可能改變html結構

  Floater.TreeCreator = TreeCreator_gemini
  Floater.undisplaySelectors = `button` //导出时，要移除的元素，这些都是按钮
  Floater.create(main, getNewButton)
})
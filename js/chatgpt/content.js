class MainChatGPT extends MainBase {
  static #selectors = Object.freeze({
    userArticle: [
      { type: 'queryAll', para: '[data-turn]' },
      { type: 'sup' }
      // { type: 'queryAll', para: ':has([data-turn])' },
      // { type: 'prop', para: 0 },
      // { type: 'closest', para: 'closest("setion")' }
    ],
    // userArticle: 'section[data-turn="user"]'
    // userArticle: "[data-turn-id-container]:has([data-turn]),.relative.w-full.overflow-visible:has([data-turn])"
  })

  get scrollY() {
    return 50
  }

  updateSelectors(selectors) {
    if (!selectors) return

    MainChatGPT.#selectors = Object.freeze({ ...MainChatGPT.#selectors, ...selectors })
  }

  constructor() {
    super(false)
    this.#listenerUrlChange()
  }
  getMainEl() {
    return document.body
  }
  getArticleParent() {
    return super.getArticleParent(MainChatGPT.#selectors.userArticle)
  }
  #listenerUrlChange() {
    super.listenerUrlChange((data) => {
      const baseUrl = 'https://chatgpt.com'
      const excludeds = ['library', 'gpts', 'codex', 's/cd_', 'apps', 'images'].map(t => (`${baseUrl}/${t}`))

      if (excludeds.some(url => data.url.startsWith(url))) {
        document.body.setAttribute(MainBase.attrs.hideFloater, '')
      } else if (data.url.startsWith('https://chatgpt.com/')) {//是聊天页面
        document.body.removeAttribute(MainBase.attrs.hideFloater)
      }
    })
  }//监听URL改变（显示/隐藏floater）

  // static #resolveMappingJson(mapping) {
  //   function traverseThread(nodeId, level, messages) {
  //     const node = mapping[nodeId]
  //     if (!node) return

  //     const message = node.message
  //     if (message && ['user', 'assistant'].includes(message.author.role) && message.content?.parts) {
  //       const msgData = {
  //         // id: nodeId,
  //         role: message.author.role,
  //         content: message.content.parts ? message.content.parts.join('') : '',
  //         contentType: message.content?.content_type,
  //         // isVisible: !message.metadata?.is_visually_hidden_from_conversation,
  //         level: level
  //       }
  //       messages.push(msgData)
  //     }

  //     if (!node.children?.length) return

  //     if (node.children.length === 1) {
  //       traverseThread(node.children[0], level, messages)
  //     } else {
  //       const message = messages[messages.length - 1]
  //       message.branchs = []
  //       node.children.forEach((childId) => {
  //         const branch = []
  //         message.branchs.push(branch)
  //         traverseThread(childId, level + 1, branch)
  //       })
  //     }
  //   }

  //   const messages = []
  //   mapping['client-created-root']?.children?.forEach(childId => {
  //     traverseThread(childId, 0, messages)
  //   })
  //   return messages
  // }
}

window.addEventListener('load', () => {
  const main = new MainChatGPT()

  const getNewButton = () => {
    // const button = (document.getElementById('sidebar-header')?.children[1]
    //         || document.getElementById('conversation-header-actions')?.previousElementSibling?.children[0])?.querySelector('a[href="/"]')
    // return button
    const button = document.querySelector('[data-testid="create-new-chat-button"]')
    return button
  }//獲取 “新對話”按鈕不可靠，chatgpa可能改變html結構


  Floater.TreeCreator = TreeCreator_chatgpt
  Floater.undisplaySelectors = `button` //导出时，要移除的元素，这些都是按钮
  Floater.create(main, getNewButton)
})
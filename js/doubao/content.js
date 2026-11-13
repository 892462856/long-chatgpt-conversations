class MainDoubao extends MainBase {
  static #selectors = Object.freeze({
    // top: 'div.flow-web-root-outlet main div[class^="container-"] > div[class^="header-"]',
    // bottm: 'div.flow-web-root-outlet main div[class^="container-"] > div[class^="footer-"]',
    articleParent: 'main div[data-testid="scroll_view"] div[data-testid="message-list"] > div[class^="inter-"]'
  })

  updateSelectors(selectors) {
    if(!selectors) return

    MainDoubao.#selectors = Object.freeze({...MainDoubao.#selectors,...selectors})
  }

  constructor(){
    super(false)
    this.#listenerUrlChange()
  }
  getMainEl() {
    return document.body
  }
  getArticleParent(){
    const articleParent = this.el?.querySelector(MainDoubao.#selectors.articleParent)
    articleParent?.setAttribute(MainBase.attrs.articleParent,'')
    this.setScroller(articleParent)
    return articleParent
  }
  #listenerUrlChange(){
    super.listenerUrlChange((data)=>{
      const baseUrl = 'https://www.doubao.com/chat'
      const excludeds = ['settings','chat-with-doc','chat-with-doc','create-image','coding','write','search','bot','drive'].map(t=>(`${baseUrl}/${t}`))
      
      if(excludeds.some(url=>data.url.startsWith(url))){
        document.body.setAttribute(MainBase.attrs.hideFloater,'')
      }else if(data.url.startsWith('https://www.doubao.com/chat/')){//是聊天页面
        document.body.removeAttribute(MainBase.attrs.hideFloater)
      }
    })
  }//监听URL改变（显示/隐藏floater）
}

window.addEventListener('load',()=>{
  const main = new MainDoubao()
  
  Floater.TreeCreator = TreeCreator_doubao
  Floater.undisplaySelectors = `div[data-testid="message_action_bar"],
                  div[data-testid="suggest_message_list"],
                  div[data-testid="suggest_message_item"],
                  div[data-testid$="-btn"],
                  div[data-testid="collapse_button"],
                  div[class^="action-"],
                  button` //导出时，要移除的元素，这些都是按钮
  Floater.create(main,undefined)//undefined：不显示new chat按钮
})

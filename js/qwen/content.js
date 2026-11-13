/*qwen独特的地方*/

class MainQwen extends MainBase {
  static #selectors = Object.freeze({
    articleParentId: 'chat-message-container',
    bottomId: 'chat-message-input-all',
    top: 'div.chatContent > div:first-child'
  })

  updateSelectors(selectors) {
    if(!selectors) return

    MainQwen.#selectors = Object.freeze({...MainQwen.#selectors,...selectors})
  }

  constructor(){
    super(false)
  }
  getMainEl() {
    return document.body
  }
  getArticleParent(){    
    const articleParent =  document.getElementById(MainQwen.#selectors.articleParentId)
    articleParent?.setAttribute(MainBase.attrs.articleParent,'')
    this.setScroller(articleParent)
    return articleParent
  }
  setMarks(){
    // if (!this.el || !this.el.isConnected) return

    // this.el.setAttribute(MainBase.attrs.main,'')
    // document.querySelector(MainQwen.#selectors.top)?.setAttribute(MainBase.attrs.top,'')
    // document.getElementById(MainQwen.#selectors.bottomId)?.setAttribute(MainBase.attrs.bottom,'')
  }//设置main/top/bottom元素的标记
}

window.addEventListener('load',()=>{
  const main = new MainQwen()
  
  Floater.TreeCreator = TreeCreator_qwen
  Floater.undisplaySelectors = `.user-message-menu,
                  .message-footer,
                  .recommend-prompt-wrap,
                  .pc-search-container,
                  button` //导出时，要移除的元素，这些都是按钮
  Floater.create(main,undefined)//undefined：不显示new chat按钮
})

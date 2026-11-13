/*kimi独特的地方
1.@问题(已解决)：刷新回复时，kimi的删除旧answer和添加新answer不是同时的，导致发生2次监听，updateTreeByMutation无法按预期处理。
2.@markdown里的HTML的层叠嵌套关系不规范，解析的结果也不规范；这个问题不好解决。
*/

class MainKimi extends MainBase {
  static #selectors = Object.freeze({
    articleParent: 'div.main div.chat-content-container > div.chat-content-list'
  })

  updateSelectors(selectors) {
    if(!selectors) return

    MainKimi.#selectors = Object.freeze({...MainKimi.#selectors,...selectors})
  }

  constructor(){
    super(false)
    this.#listenerUrlChange()
  }
  getMainEl() {
    return document.body
  }
  getArticleParent(){
    const articleParent = this.el?.querySelector(MainKimi.#selectors.articleParent)
    articleParent?.setAttribute(MainBase.attrs.articleParent,'')
    this.setScroller(articleParent)
    return articleParent
  }
  #listenerUrlChange(){
    super.listenerUrlChange((data)=>{
      if(data.url.startsWith('https://www.kimi.com/chat/')){//是聊天页面
        document.body.removeAttribute(MainBase.attrs.hideFloater)
      }else{//不是聊天页面
        document.body.setAttribute(MainBase.attrs.hideFloater,'')
      }
    })
  }//监听URL改变（显示/隐藏floater）
}

window.addEventListener('load',()=>{
  const main = new MainKimi()
  
  Floater.TreeCreator = TreeCreator_kimi
  Floater.undisplaySelectors = `.segment-user-actions,
              .segment-assistant-actions,
              .segment-assistant-actions-content,
              .simple-button,
              button,
              .recommend-prompt-list` //导出时，要移除的元素，这些都是按钮
  Floater.create(main,undefined)//undefined：不显示new chat按钮
})

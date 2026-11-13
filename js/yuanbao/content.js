/*Yuanbao独特的地方
流：https://yuanbao.tencent.com/api/chat/repeat/a6d14fa1-28ef-4fe1-8f38-15d14bbe3edd
*/

class MainYuanbao extends MainBase {
  static #selectors = Object.freeze({
    articleParent: 'div.agent-chat__list__content',
    bottom: 'div.agent-dialogue__content--common__input',
    top: 'div.agent-dialogue__content--common__header'
  })

  updateSelectors(selectors) {
    if(!selectors) return

    MainYuanbao.#selectors = Object.freeze({...MainYuanbao.#selectors,...selectors})
  }

  constructor(){
    super(false)
    this.#listenerUrlChange()
  }
  getMainEl() {
    return document.body
  }
  getArticleParent(){
    const articleParent =  document.querySelector(MainYuanbao.#selectors.articleParent)
    articleParent?.setAttribute(MainBase.attrs.articleParent,'')
    this.setScroller(articleParent)
    return articleParent
  }
  #listenerUrlChange(){
    super.listenerUrlChange((data)=>{
      if(data.url.startsWith('https://yuanbao.tencent.com/chat/')){//是聊天页面
        document.body.removeAttribute(MainBase.attrs.hideFloater)
      }else{//不是聊天页面
        document.body.setAttribute(MainBase.attrs.hideFloater,'')
      }
    })
  }
}

window.addEventListener('load',()=>{
  //console.clear = ()=>{}//@禁止yuanbao清空控制台，发布时记得要注释掉这句代码

  const main = new MainYuanbao()

  TreeCreator_yuanbao.launchRepeatEvent = (obj)=>main.launchChangeEvent(obj)
  
  Floater.TreeCreator = TreeCreator_yuanbao
  Floater.undisplaySelectors = `.agent-chat__conv--human__toolbar,
                  .agent-chat__question-toolbar,
                  .agent-chat__toolbar__item,
                  .agent-chat__conv--ai__toolbar,
                  .agent-chat__toolbar,
                  .hyc-common-markdown__code__hd__rm,
                  .hyc-common-markdown__code__option,
                  .agent-chat__bubble__suffix,
                  button` //导出时，要移除的元素，这些都是按钮
  Floater.create(main,undefined)//undefined：不显示new chat按钮
})

class Articles{
  #ul
  #onRootNodeOpen = ()=>{}
  constructor({$ul,onRootNodeOpen}){
    this.#ul = $ul
    this.#onRootNodeOpen = onRootNodeOpen
  }

  get folded(){
    return this.#getChildren().every((answer)=>Articles.#getFoldStatus(answer))
  }//注意：只要有一个是打开的，folded就为false.

  #getChildren(){
    return Array.from(this.#ul.children).map(li=>li.__reply).filter(t=>t)
  }

  toggleItem(answer, opened){
    if(answer){
      const userArticle = Array.from(this.#ul.children).find(li=>li.__reply === answer)?.__ref?.deref()
      if (opened) {
        answer.removeAttribute(globalClassNames.collapsed)
        userArticle?.removeAttribute(globalClassNames.collapsed)
      }else{
        answer.setAttribute(globalClassNames.collapsed, '')
        userArticle?.setAttribute(globalClassNames.collapsed, '')

        const fn = this.#getClickHandle(answer,userArticle)
        answer.addEventListener('click',fn,true)
        userArticle?.addEventListener('click',fn,true)
      }
    }
  }

  toggle(opened = undefined){
    if(opened === undefined){
      opened = !this.folded
    }//切换

    this.#getChildren().forEach((answer) => {
      this.toggleItem(answer, opened)
    })
  }//全部摺叠/展開Reply Article
  
  static #getFoldStatus(answer){
    return answer.hasAttribute(globalClassNames.collapsed)
  }

  #getClickHandle(answer,userArticle){
    const the = this
    const handle = ()=>{
      answer.removeEventListener('click',handle,true)
      userArticle.removeEventListener('click',handle,true)
      answer.removeAttribute(globalClassNames.collapsed)
      userArticle.removeAttribute(globalClassNames.collapsed)
      the.#onRootNodeOpen({answer,userArticle})
    }
    return handle
  }
}
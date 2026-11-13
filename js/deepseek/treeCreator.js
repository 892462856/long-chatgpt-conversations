class TreeCreator_ds {
  static #selectors = Object.freeze({
    markdown: '.ds-markdown',  //'.ds-markdown--block',
    // commentButton: '.ds-icon-button',
    // answerIcon: ':scope > div > svg[viewBox="0 0 30 30"]', //deeseek回复的那个鲸鱼图标
  })

  static updateSelectors(selectors) {
    if(!selectors) return

    TreeCreator_ds.#selectors = Object.freeze({...TreeCreator_ds.#selectors,...selectors})
  }

  static async #createUlByReplying({isDeep, $ul, li, userArticle, answerArticle, continuator = undefined}) {
    await TreeCreatorBase.createUlByReplying({isDeep, $ul, li, userArticle, answerArticle}, {
      getMarkdown: TreeCreator_ds.#getMarkdown,
      getAnswerMark: TreeCreator_ds.#getAnswerMark,
      getAnswerByUserArticle: TreeCreator_ds.#getAnswerByUserArticle,
      getEndMark: TreeCreator_ds.#getEndMark
    }, continuator)
  }

  static async updateTreeByMutation($ul, isDeep, obj) {
    await TreeCreatorBase.updateTreeByMutation($ul, isDeep, {
      createUlByReplying: TreeCreator_ds.#createUlByReplying, 
      getAnswerByUserArticle: TreeCreator_ds.#getAnswerByUserArticle,
      isUserArticle: TreeCreator_ds.#isUserArticle, 
      isArticle: TreeCreator_ds.#isArticle,
      getMarkdown: TreeCreator_ds.#getMarkdown,
      getUserContentEl: TreeCreator_ds.#getUserContentEl
    },obj)
  }

  static regainCreateRootLi(li, isDeep) {
    return TreeCreatorBase.regainCreateRootLi(li, isDeep, TreeCreator_ds.#getMarkdown, TreeCreator_ds.#getAnswerByUserArticle)
  }

  static #getAnswerByUserArticle(userArticle) {
    let isRequestPlaceholder = false
    let answerArticle = userArticle?.nextElementSibling
    const isReply = !!TreeCreator_ds.#isReplyArticle(answerArticle)
    if(isReply){
      isRequestPlaceholder = answerArticle.children.length < 2
      // const $markdown = answerArticle.querySelector(TreeCreator_ds.#selectors.markdown)      
      // if($markdown){
      //   if($markdown.children.length < 1){
      //     isRequestPlaceholder = true
      //   }
      // }else{
      //   isRequestPlaceholder = true
      // }
    }else{
      answerArticle = undefined
    }
    return { answerArticle, isRequestPlaceholder }
  }

  static #isReplyArticle(article){
    return !!article && Array.from(article.parentElement.children).indexOf(article) % 2 !== 0
    // return !!article?.querySelector(TreeCreator_ds.#selectors.markdown)
  }

  static #isUserArticle(articleParent,article) {
    const isUser = !TreeCreator_ds.#isReplyArticle(article)
    return isUser
  }//确认article是否是user article(不是reply就是user)

  static #getAnswerMark(answerArticle) {
    return answerArticle
    // return TreeCreator_ds.#getMarkdown(answerArticle)
  }

  static #getEndMark(answerArticle) {
    return answerArticle?.children.length > 1
  }

  static #getMarkdown(answerArticle) {
    const markdown = answerArticle?.querySelector(TreeCreator_ds.#selectors.markdown)
    markdown?.setAttribute(TreeCreatorBase.attrs.markdown,'')
    return markdown
  }

  static #getUserContentEl(userArticle) {
    if(!userArticle) return userArticle
    const len = userArticle.children.length
    let el
    if(len >= 2){
      el = userArticle.children[len - 2] //倒数第二个child
    }else{
      el = userArticle.firstElementChild || userArticle
    }
    el?.setAttribute(TreeCreatorBase.attrs.userContent,'')
    return el
  }

  static #isArticle(articleParent,el) {
    return el.parentElement === articleParent
  }
}
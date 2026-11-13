class TreeCreator_kimi {
  static #selectors = Object.freeze({
    article: 'div.chat-content-item',
    userArticle: 'div.chat-content-item-user',
    answerArticle: 'div.chat-content-item-assistant',
    userArticleContentEl: 'div.user-content',
    markdown: 'div.markdown',
    answerEndMark: 'div.segment-assistant-actions', //div.segment-assistant-actions:chatting="false"
  })

  static updateSelectors(selectors) {
    if(!selectors) return

    TreeCreator_kimi.#selectors = Object.freeze({...TreeCreator_kimi.#selectors,...selectors})
  }

  static async #createUlByReplying({isDeep, $ul, li, userArticle, answerArticle, continuator = undefined}) {
    await TreeCreatorBase.createUlByReplying({isDeep, $ul, li, userArticle, answerArticle}, {
      getMarkdown: TreeCreator_kimi.#getMarkdown,
      getAnswerMark: TreeCreator_kimi.#getAnswerMark,
      getAnswerByUserArticle: TreeCreator_kimi.#getAnswerByUserArticle,
      getEndMark: TreeCreator_kimi.#getEndMark
    }, continuator)
  }

  static async updateTreeByMutation($ul, isDeep, obj) {
    await TreeCreatorBase.updateTreeByMutation($ul, isDeep, {
      createUlByReplying: TreeCreator_kimi.#createUlByReplying, 
      getAnswerByUserArticle: TreeCreator_kimi.#getAnswerByUserArticle,
      isUserArticle: TreeCreator_kimi.#isUserArticle, 
      isArticle: TreeCreator_kimi.#isArticle,
      getMarkdown: TreeCreator_kimi.#getMarkdown,
      getUserContentEl: TreeCreator_kimi.#getUserContentEl
    },obj)
  }

  static regainCreateRootLi(li, isDeep) {
    return TreeCreatorBase.regainCreateRootLi(li, isDeep, TreeCreator_kimi.#getMarkdown, TreeCreator_kimi.#getAnswerByUserArticle)
  }

  static #getAnswerByUserArticle(userArticle) {
    let isRequestPlaceholder = false
    let answerArticle = userArticle?.nextElementSibling
    const isReply = !!TreeCreator_kimi.#isReplyArticle(answerArticle)
    if(isReply){
      isRequestPlaceholder = !TreeCreator_kimi.#getEndMark(answerArticle)
    }else{
      answerArticle = undefined
    }
    return { answerArticle, isRequestPlaceholder }
  }

  static #isReplyArticle(article){
    return !!article?.matches(TreeCreator_kimi.#selectors.answerArticle)
  }

  static #isUserArticle(articleParent,article) {
    return !!article?.matches(TreeCreator_kimi.#selectors.userArticle)
  }

  static #getAnswerMark(answerArticle) {
    return answerArticle
  }

  static #getEndMark(answerArticle) {
    return answerArticle?.querySelector(TreeCreator_kimi.#selectors.answerEndMark)
  }

  static #getMarkdown(answerArticle) {
    const markdown = answerArticle?.querySelector(TreeCreator_kimi.#selectors.markdown)
    markdown?.setAttribute(TreeCreatorBase.attrs.markdown,'')
    return markdown
  }

  static #getUserContentEl(userArticle) {
    return userArticle?.querySelector(TreeCreator_kimi.#selectors.userArticleContentEl)
  }

  static #isArticle(articleParent,el) {
    return el.parentElement === articleParent && el.matches(TreeCreator_kimi.#selectors.article)
  }
}
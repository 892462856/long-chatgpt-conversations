class TreeCreator_chatgpt {
  static #selectors = Object.freeze({
    article: ':has([data-turn])',
    userArticle: ':has([data-turn="user"])',
    answerArticle: ':has([data-turn="assistant"])',

    userArticleContentEl: 'div[data-message-author-role="user"]',
    userArticleContentEl2: 'div.whitespace-pre-wrap', //userArticleContentEl2被userArticleContentEl包含；@注意：div.whitespace-pre-wrap這個選擇器感覺不可靠
    markdown: '.markdown',
    answerEndMark: 'button[data-testid="good-response-turn-action-button"],button[data-testid="copy-turn-action-button"],button[data-testid="voice-play-turn-action-button"]',
    // messagePlaceholderRequest: '[data-message-id^="placeholder-request-"]',
  })

  static updateSelectors(selectors) {
    if(!selectors) return

    TreeCreator_chatgpt.#selectors = Object.freeze({...TreeCreator_chatgpt.#selectors,...selectors})
  }

  static async #createUlByReplying({isDeep, $ul, li, userArticle, answerArticle, continuator = undefined}) {
    await TreeCreatorBase.createUlByReplying({isDeep, $ul, li, userArticle, answerArticle}, {
      getMarkdown: TreeCreator_chatgpt.#getMarkdown,
      getAnswerMark: TreeCreator_chatgpt.#getAnswerMark,
      getAnswerByUserArticle: TreeCreator_chatgpt.#getAnswerByUserArticle,
      getEndMark: TreeCreator_chatgpt.#getEndMark
    }, continuator)
  }

  static async updateTreeByMutation($ul, isDeep, obj) {
    await TreeCreatorBase.updateTreeByMutation($ul, isDeep, {
      createUlByReplying: TreeCreator_chatgpt.#createUlByReplying, 
      getAnswerByUserArticle: TreeCreator_chatgpt.#getAnswerByUserArticle,
      isUserArticle: TreeCreator_chatgpt.#isUserArticle, 
      isArticle: TreeCreator_chatgpt.#isArticle,
      getMarkdown: TreeCreator_chatgpt.#getMarkdown,
      getUserContentEl: TreeCreator_chatgpt.#getUserContentEl
    },obj)
  }

  static regainCreateRootLi(li, isDeep) {
    return TreeCreatorBase.regainCreateRootLi(li, isDeep, TreeCreator_chatgpt.#getMarkdown, TreeCreator_chatgpt.#getAnswerByUserArticle)
  }

  static #getAnswerByUserArticle(userArticle) {
    let isRequestPlaceholder = false
    let answerArticle = userArticle?.nextElementSibling
    const isReply = !!TreeCreator_chatgpt.#isReplyArticle(answerArticle)
    if (isReply) {      
      // isRequestPlaceholder = !TreeCreator_chatgpt.#getEndMark(answerArticle)
      // isRequestPlaceholder = !!answerArticle.querySelector(TreeCreator_chatgpt.#selectors.messagePlaceholderRequest)
      isRequestPlaceholder = !TreeCreator_chatgpt.#getEndMark(answerArticle)
    } else {
      answerArticle = undefined
    }
    return { answerArticle, isRequestPlaceholder }
  }

  static #isReplyArticle(article) {
    return !!article?.matches(TreeCreator_chatgpt.#selectors.answerArticle)
  }

  static #isUserArticle(articleParent, article) {
    return !!article?.matches(TreeCreator_chatgpt.#selectors.userArticle)
  }

  static #getAnswerMark(answerArticle) {
    return answerArticle
  }

  static #getEndMark(answerArticle) {
    return answerArticle?.querySelector(TreeCreator_chatgpt.#selectors.answerEndMark)
  }

  static #getMarkdown(answerArticle) {
    const markdown = answerArticle?.querySelector(TreeCreator_chatgpt.#selectors.markdown)
    markdown?.setAttribute(TreeCreatorBase.attrs.markdown, '')

    return markdown
  }

  static #getUserContentEl(userArticle) {
    let el = userArticle?.querySelector(TreeCreator_chatgpt.#selectors.userArticleContentEl)
    if(el){
      const el2 = el.querySelector(TreeCreator_chatgpt.#selectors.userArticleContentEl2)
      if(el2){
        el2.setAttribute(TreeCreatorBase.attrs.userContent,'')
        el = el2
      }
    }
    return el
  }

  static #isArticle(articleParent, el) {
    return el.parentElement === articleParent && el.matches(TreeCreator_chatgpt.#selectors.article)
  }
}
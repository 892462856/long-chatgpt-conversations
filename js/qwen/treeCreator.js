/*qwen的特点：
1.#getEndMark的实现：新回复的HTML，一开始就存在div.message-footer，只是没有按钮
2.qwen的“死”特点：load时，提问和回复 有html框架，但没文本内容
*/
TreeCreatorBase.maxTryTime = 40

class TreeCreator_qwen {
  static #selectors = Object.freeze({
    userArticle: '.qwen-chat-message-user',    
    answerArticle: '.qwen-chat-message-assistant',
    userTextContentDiv: 'div.chat-user-message > p',    
    markdown: 'div.qwen-markdown',
    answerCommentButton: 'div.response-message-footer div[aria-describedby]'
  })

  static updateSelectors(selectors) {
    if(!selectors) return

    TreeCreator_qwen.#selectors = Object.freeze({...TreeCreator_qwen.#selectors,...selectors})
  }

  static async #createUlByReplying({ isDeep, $ul, li, userArticle, answerArticle, continuator = undefined }) {
    await TreeCreatorBase.createUlByReplying({ isDeep, $ul, li, userArticle, answerArticle }, {
      getMarkdown: TreeCreator_qwen.#getMarkdown,
      getAnswerMark: TreeCreator_qwen.#getAnswerMark,
      getAnswerByUserArticle: TreeCreator_qwen.#getAnswerByUserArticle,
      getEndMark: TreeCreator_qwen.#getEndMark
    }, continuator)
  }

  static async updateTreeByMutation($ul, isDeep, obj) {
    if (obj.type === 'new') {
      await wait(200)
    }

    if (obj.type === 'load') {
      const children = Array.from(obj.articleParent.children).reverse()
      for (let i = 0; i < children.length; i++) {
        const reply = TreeCreator_qwen.#isReplyArticle(children[i]) && children[i]
        if (reply) {
          const markdown = reply.querySelector(TreeCreator_qwen.#selectors.markdown)
          if (markdown && markdown.children.length === 0) {//@这里不完美的地方：如果lastReply是图片，则markdown.children.length>0
            await wait(3000)
            console.log('load wait')
            TreeCreator_qwen.updateTreeByMutation($ul, isDeep, obj)
            return
          }
        }
      }
    }//2.qwen的“死”特点

    await TreeCreatorBase.updateTreeByMutation($ul, isDeep, {
      createUlByReplying: TreeCreator_qwen.#createUlByReplying,
      getAnswerByUserArticle: TreeCreator_qwen.#getAnswerByUserArticle,
      isUserArticle: TreeCreator_qwen.#isUserArticle,
      isArticle: TreeCreator_qwen.#isArticle,
      getMarkdown: TreeCreator_qwen.#getMarkdown,
      getUserContentEl: TreeCreator_qwen.#getUserContentEl
    }, obj)
  }

  static regainCreateRootLi(li, isDeep) {
    return TreeCreatorBase.regainCreateRootLi(li, isDeep, TreeCreator_qwen.#getMarkdown, TreeCreator_qwen.#getAnswerByUserArticle)
  }

  static #getAnswerByUserArticle(userArticle) {
    let isRequestPlaceholder = false
    let answerArticle = userArticle?.nextElementSibling
    const isReply = TreeCreator_qwen.#isReplyArticle(answerArticle)
    if (isReply) {
      isRequestPlaceholder = !answerArticle.querySelector(TreeCreator_qwen.#selectors.answerCommentButton)
    } else {
      answerArticle = undefined
    }
    return { answerArticle, isRequestPlaceholder }
  }

  static #isReplyArticle(article) {
    return article?.matches(TreeCreator_qwen.#selectors.answerArticle)
  }

  static #isUserArticle(articleParent, article) {
    return article?.matches(TreeCreator_qwen.#selectors.userArticle)
  }

  static #getAnswerMark(answerArticle) {
    return answerArticle
  }

  static #getEndMark(answerArticle) {
    return answerArticle?.querySelector(`${TreeCreator_qwen.#selectors.answerCommentButton}`)
  }

  static #getMarkdown(answerArticle) {
    const markdown = answerArticle?.querySelector(TreeCreator_qwen.#selectors.markdown)
    markdown?.setAttribute(TreeCreatorBase.attrs.markdown, '')
    return markdown
  }

  static #getUserContentEl(userArticle) {
    if (!userArticle) return userArticle
    const el = userArticle.querySelector(TreeCreator_qwen.#selectors.userTextContentDiv)

    el?.setAttribute(TreeCreatorBase.attrs.userContent, '')
    return el
  }

  static #isArticle(articleParent, el) {
    return el.parentElement === articleParent
  }
}
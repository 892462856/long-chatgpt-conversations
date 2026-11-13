/*
gemini的特殊:
1.markdown加载成功后会立即删除，然后重新加载，内容一样。@load和new的重新加载 有点小区别
  @@@解决不完善
2.new的提问如果有多个回复(刷新)，切换回复时，markdown的内容会改变，而不是整个回答重加载
3.回复包含于提问（[processed="reply"]元素包含于[processed="user"]元素），其它模型页面都是并列关系
*/
class TreeCreator_gemini {
  static #selectors = Object.freeze({
    //user-notice,model-thoughts,.response-container-footer
    userArticle: 'user-query',
    answerArticle: 'model-response',
    markdown: 'message-content > .markdown.markdown-main-panel',
    userArticleContentEl: 'user-query-content .query-text-line', //query-text-line ng-star-inserted
    answerEndMark: 'message-actions',
    paginator: 'message-actions mat-paginator'
  })

  static updateSelectors(selectors) {
    if (!selectors) return

    TreeCreator_gemini.#selectors = Object.freeze({ ...TreeCreator_gemini.#selectors, ...selectors })
  }

  static async #createUlByReplying({ isDeep, $ul, li, userArticle, answerArticle, continuator = undefined }) {
    await TreeCreatorBase.createUlByReplying({ isDeep, $ul, li, userArticle, answerArticle }, {
      getMarkdown: TreeCreator_gemini.#getMarkdown,
      getAnswerMark: TreeCreator_gemini.#getAnswerMark,
      getAnswerByUserArticle: TreeCreator_gemini.#getAnswerByUserArticle,
      getEndMark: TreeCreator_gemini.#getEndMark
    }, continuator)

    // TreeCreator_gemini.#observePaginator($ul,li,answerArticle)
    const childs = Array.from(li.querySelectorAll('li'))
    if(childs.length && childs.find(li =>(!li.__ref?.deref()?.isConnected))){
      debugger
      TreeCreator_gemini.regainCreateRootLi(li, isDeep)
    }//gemini的特殊处：容易删除元素然后重新生成（内容相同）
  }

  static async updateTreeByMutation($ul, isDeep, obj) {
    if (obj.type === 'load' || obj.type === 'new') {
      await wait(500)
    }

    await TreeCreatorBase.updateTreeByMutation($ul, isDeep, {
      createUlByReplying: TreeCreator_gemini.#createUlByReplying,
      getAnswerByUserArticle: TreeCreator_gemini.#getAnswerByUserArticle,
      isUserArticle: TreeCreator_gemini.#isUserArticle,
      isArticle: TreeCreator_gemini.#isArticle,
      getMarkdown: TreeCreator_gemini.#getMarkdown,
      getUserContentEl: TreeCreator_gemini.#getUserContentEl
    }, obj)

    // await wait(500)
    // if (obj.type === 'load' || obj.type === 'new') {
    //   const list = TreeCreatorBase.power ? Array.from($ul.children) : Array.from($ul.children).slice(0, -3)
    //   list.forEach(rootLi => {
    //     // if (rootLi.classList.contains(TreeCreatorBase.leafClass)) return
    //     if (rootLi.__observeMarkdown) return
    //     rootLi.__observeMarkdown = true
    //     // console.log('regainCreateRootLi',rootLi)/
    //     const isDeep = TreeCreator_gemini.getDeepValue()
    //     TreeCreator_gemini.regainCreateRootLi(rootLi, isDeep) //gemini的特殊处
    //   })
    // }
  }

  static regainCreateRootLi(li, isDeep) {
    return TreeCreatorBase.regainCreateRootLi(li, isDeep, TreeCreator_gemini.#getMarkdown, TreeCreator_gemini.#getAnswerByUserArticle)
  }

  static #obs = {}
  static #observePaginator($ul, li, answerArticle) {
    const obs = TreeCreator_gemini.#obs
    obs.observer?.disconnect()

    if (!!answerArticle?.querySelector(TreeCreator_gemini.#selectors.paginator)) {
      const markdown = TreeCreator_gemini.#getMarkdown(answerArticle)
      obs.observer = new MutationObserver(() => {
        console.log('markdown change', li, markdown)
        const isDeep = TreeCreator_gemini.getDeepValue()
        li = li.isConnected ? li : Array.from($ul.children).find(li => li.__reply === answerArticle) //如果刷新了tree，li会重构
        TreeCreator_gemini.regainCreateRootLi(li, isDeep)
      })
      obs.observer.observe(markdown, { childList: true })
    }
  }
  static getDeepValue() {
    return true
  }

  static #getAnswerByUserArticle(el) {
    let isRequestPlaceholder = false
    let answerArticle = TreeCreator_gemini.#getAnswer(el)
    if (answerArticle) {
      isRequestPlaceholder = !TreeCreator_gemini.#getEndMark(answerArticle)
    } else {
      answerArticle = undefined
    }
    return { answerArticle, isRequestPlaceholder }
  }

  static #getAnswer(el) {
    return el ? Array.from(el.children).find(el => el.matches(TreeCreator_gemini.#selectors.answerArticle)) : undefined
  }

  static #getUserArticle(el) {
    return el ? Array.from(el.children).find(el => el.matches(TreeCreator_gemini.#selectors.userArticle)) : undefined
  }

  static #isUserArticle(articleParent, article) {
    return article ? !!Array.from(article.children).find(el => el.matches(TreeCreator_gemini.#selectors.userArticle)) : false
  }

  static #getAnswerMark(answerArticle) {
    return answerArticle
  }

  static #getEndMark(answerArticle) {
    return answerArticle?.querySelector(TreeCreator_gemini.#selectors.answerEndMark)
  }

  static #getMarkdown(answerArticle) {
    const markdown = answerArticle?.querySelector(TreeCreator_gemini.#selectors.markdown)
    markdown?.setAttribute(TreeCreatorBase.attrs.markdown, '')

    return markdown
  }

  static #getUserContentEl(userArticle) {
    const el = TreeCreator_gemini.#getUserArticle(userArticle)?.querySelector(TreeCreator_gemini.#selectors.userArticleContentEl)
    el?.setAttribute(TreeCreatorBase.attrs.userContent, '')
    return el || TreeCreator_gemini.#cnotentEl
  }

  static #isArticle(articleParent, el) {
    return el.parentElement === articleParent && TreeCreator_gemini.#isUserArticle(articleParent, el)
  }

  static #cnotentEl = (() => {
    const div = document.createElement('div')
    div.textContent = '[Non-text]'
    return div
  })()

  static getUserBy(el) {
    return el.closest(`[${TreeCreatorBase.processedMark}="user"]`)
  }
}
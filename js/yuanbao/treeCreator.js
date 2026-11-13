/*qwen的特点：
1.#getEndMark的实现：新回复的HTML，一开始就存在div.message-footer，只是没有按钮
2.有时候加载的是HTML框架，内容未加载。
3.最后一个回复，点刷新时，不会重新替换整个el，而是只替换markdown
*/

class TreeCreator_yuanbao {
  static #selectors = Object.freeze({
    article: 'div.agent-chat__list__item',
    userArticle: '.agent-chat__list__item--human',
    answerArticle: '.agent-chat__list__item--ai',
    userTextContentEl: ':scope div.agent-chat__bubble--human > div.agent-chat__bubble__content div.hyc-content-text',
    answerCommentBar: 'div.agent-chat__conv--ai__toolbar div.agent-chat__toolbar__item',
    markdown: 'div.hyc-common-markdown-style',
    speechBox: 'div.agent-chat__speech-text--box',
    markdownThinkParent: 'div.hyc-component-reasoner__think',
    // markdownTextParent: 'div.hyc-component-reasoner__text'，
    imageAnswerMark: 'div.hyc-component-image-group',
    entryAnswerMark: 'div.hyc-sub-page-entry-box',
  })
  static updateSelectors(selectors) {
    if(!selectors) return

    TreeCreator_yuanbao.#selectors = Object.freeze({...TreeCreator_yuanbao.#selectors,...selectors})
  }
  static launchRepeatEvent
  static #lastAnswerObserver

  static async #createUlByReplying({ isDeep, $ul, li, userArticle, answerArticle, continuator = undefined }) {
    TreeCreatorBase.maxTryTime = 40
    await TreeCreatorBase.createUlByReplying({ isDeep, $ul, li, userArticle, answerArticle }, {
      getMarkdown: TreeCreator_yuanbao.#getMarkdown,
      getAnswerMark: TreeCreator_yuanbao.#getAnswerMark,
      getAnswerByUserArticle: TreeCreator_yuanbao.#getAnswerByUserArticle,
      getEndMark: TreeCreator_yuanbao.#getEndMark
    }, continuator)
  }

  static async updateTreeByMutation($ul, isDeep, obj) {
    TreeCreatorBase.maxTryTime = 40
    
    if (obj.type === 'new' && obj.articleParent?.isConnected) {
      const children = Array.from(obj.articleParent.children).reverse()
      for (let i = 0; i < children.length; i++) {
        const reply = children[i]
        if(!children[i].matches(TreeCreator_yuanbao.#selectors.answerArticle)) continue
        if (reply) {
          const markdown = reply.querySelector(TreeCreator_yuanbao.#selectors.markdown)
          if (markdown && markdown.children.length === 0) {//@这里不完美的地方：如果lastReply是图片，则markdown.children.length>0
            await wait(2000)
            console.log('load wait')
            TreeCreator_yuanbao.updateTreeByMutation($ul, isDeep, obj)
            return
          }
        }
      }
    }//解决特点2

    await TreeCreatorBase.updateTreeByMutation($ul, isDeep, {
      createUlByReplying: TreeCreator_yuanbao.#createUlByReplying,
      getAnswerByUserArticle: TreeCreator_yuanbao.#getAnswerByUserArticle,
      isUserArticle: TreeCreator_yuanbao.#isUserArticle,
      isArticle: TreeCreator_yuanbao.#isArticle,
      getMarkdown: TreeCreator_yuanbao.#getMarkdown,
      getUserContentEl: TreeCreator_yuanbao.#getUserContentEl,
      alterArticleBefore: TreeCreator_yuanbao.#alterArticleBefore
    }, obj)

    TreeCreator_yuanbao.#observerLastAnswerRefresh($ul, isDeep, obj)//解决特点3
  }

  static #alterArticleBefore($ul, { repeatAnswer, removeArticles }) {
    if (repeatAnswer) {
      const li = Array.from($ul.children).find(li => li.__reply === repeatAnswer)
      if (li) {
        TreeCreatorBase.removeLi(li)
      }//正在刷新的回答，則li移除；后面的代码会重新添加回
    } else {
      TreeCreatorBase.clearTreeByRemoveArticles($ul, removeArticles)
    }
  }//先刪除

  static #observerLastAnswerRefresh($ul, isDeep, { type, articleParent }) {
    console.log('#observerLastAnswerRefresh')

    TreeCreator_yuanbao.#lastAnswerObserver?.disconnect()

    if (type !== 'new' || !articleParent?.isConnected) return

    const lastAnswer = Array.from(articleParent.children).reverse().find(el => el.matches(TreeCreator_yuanbao.#selectors.answerArticle))
    if (!lastAnswer) return

    TreeCreator_yuanbao.#lastAnswerObserver = new MutationObserver(() => {
      const endMark = TreeCreator_yuanbao.#getEndMark(lastAnswer)
      if (!endMark) {
        const markdown = TreeCreator_yuanbao.#getMarkdown(lastAnswer)
        if (!markdown) {
          TreeCreator_yuanbao.#lastAnswerObserver.disconnect() //@避免回答过程中无必要的重复执行observe，影响性能
          TreeCreator_yuanbao.#lastAnswerObserver = undefined

          const obj = { type: 'new', articleParent, repeatAnswer: lastAnswer }
          console.log(obj)
          TreeCreator_yuanbao.launchRepeatEvent(obj)
        }
      }
    })
    TreeCreator_yuanbao.#lastAnswerObserver.observe(lastAnswer, { childList: true, subtree: true })
  }//解决特点2

  static regainCreateRootLi(li, isDeep) {
    return TreeCreatorBase.regainCreateRootLi(li, isDeep, TreeCreator_yuanbao.#getMarkdown, TreeCreator_yuanbao.#getAnswerByUserArticle)
  }

  static #getAnswerByUserArticle(userArticle) {
    let isRequestPlaceholder = false
    let answerArticle = userArticle?.nextElementSibling
    const isReply = !!TreeCreator_yuanbao.#isReplyArticle(answerArticle)
    if (isReply) {
      isRequestPlaceholder = !TreeCreator_yuanbao.#getEndMark(answerArticle)
    } else {
      answerArticle = undefined
    }
    return { answerArticle, isRequestPlaceholder }
  }

  static #isReplyArticle(article) {
    return !!article?.matches(TreeCreator_yuanbao.#selectors.answerArticle)
  }

  static #isUserArticle(articleParent, article) {
    return !!article?.matches(TreeCreator_yuanbao.#selectors.userArticle)
  }

  static #getAnswerMark(answerArticle) {
    return answerArticle
  }

  static #getEndMark(answerArticle) {
    return answerArticle?.querySelectorAll(`${TreeCreator_yuanbao.#selectors.answerCommentBar}`).length > 3
  }

  static #getMarkdown(answerArticle) {
    const speechBox = answerArticle?.querySelector(TreeCreator_yuanbao.#selectors.speechBox)
    if (!speechBox) return undefined

    const markdowns = speechBox.querySelectorAll(TreeCreator_yuanbao.#selectors.markdown)
    if (markdowns?.length) {//有文字回复
      speechBox.removeAttribute(TreeCreatorBase.attrs.markdownOther) //解决 刷新后，回复模式改变的问题。

      const list = Array.from(markdowns)
      list.forEach(markdown => { markdown.setAttribute(TreeCreatorBase.attrs.markdown, '') })
      return list.find(markdown => !markdown.closest(TreeCreator_yuanbao.#selectors.markdownThinkParent)) //排除 思考文本
      // return markdowns[markdowns.length - 1]
    } else {//非文字回复
      if (speechBox.querySelector(TreeCreator_yuanbao.#selectors.imageAnswerMark)) {
        speechBox.setAttribute(TreeCreatorBase.attrs.markdownOther, 'image')
      } else if (speechBox.querySelector(TreeCreator_yuanbao.#selectors.entryAnswerMark)) {
        speechBox.setAttribute(TreeCreatorBase.attrs.markdownOther, 'entry')
      }
    }
    return undefined
  }//@注意：要考虑到Html在回答中出现的先后，和 刷新后的下一次

  static #getUserContentEl(userArticle) {
    if (!userArticle) return userArticle
    const el = userArticle.querySelector(TreeCreator_yuanbao.#selectors.userTextContentEl)

    el?.setAttribute(TreeCreatorBase.attrs.userContent, '')
    return el
  }

  static #isArticle(articleParent, el) {
    return el.parentElement === articleParent && el.matches(TreeCreator_yuanbao.#selectors.article)
  }
}
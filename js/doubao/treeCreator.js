/*doubao独特的地方：
1.@@@先加载HTML框架，再加载细节数据。
2.@@endMark可以在加载中，出现。
3.@回复的前部分，会替换answerArticle，再替换userArticle
4.@@@markdown的子元素，不完全是按序加载，ul/ol会和BR一起加载；所以要忽略br（br不承载文本信息）。
5.@刷新按钮：在回复中，也可以出现，当用户鼠标over时。
6.@userArticle/answerArticle都可以单独删除，超不规范！！@@暂不解决它的tree导航/折叠问题
7.@@@@这个问题无解：The Content Security Policy directive 'upgrade-insecure-requests' is ignored when delivered in a report-only policy.
*/
class TreeCreator_doubao {
  static #selectors = Object.freeze({
    // a: 'ddiv[data-target-id="message-box-target-id"]',//[data-testid="union_message"]
    // a2: 'div[data-testid="message-block-container"]',
    // a3: 'div[data-testid="send_message"]',
    // a4: 'div[data-testid="message_content"]', //[data-message-id="13347328926944770"]|[data-plugin-identifier="Symbol(send-video-creation-content|MusicGenerate|send-quota-content|send-nested-content))"]
    // a5_1: 'div[data-testid="message_text_content"]',
    // a5_2: 'div[data-testid="ref-content-wrapper"]', //a5_1前面
    // // a5_1_1: 'div[data-testid="message_text_content"] parent 上一个(img)',
    // a5_3: 'div[data-testid="message_attachment_grid"]',

    // b: 'div[data-target-id="message-box-target-id"]', //[data-testid="union_message"] 
    // b2: 'div[data-testid="message-block-container"]',  
    // b3: 'div[data-testid="receive_message"]',
    // b4: 'div[data-testid="message_content"]', //[data-message-id="13347328926945026"]
    // b5_0: 'div[data-plugin-identifier="Symbol(receive-create-video-content|LyricToSongMusic|infra:receive-message-box:text|receive-podcast-content|receive-ci-reply-text-content|ugc:receive-message-box:ugc-text)"]',
    // b5_1: 'div[data-testid="message_text_content"]',
    // b5_2: 'div[data-testid="message_image_content"]',
    // // b5_3: 'div[data-testid="message_text_content"] 前一个：思考过程',

    // b5_0_1: 'div[data-testid="music-generation-card-content"]',

    // un: 'div[data-testid="message_action_bar"]', //a+b，div[data-testid="send_message/receive_message"] > div[data-testid="message_action_bar"]

    userArticle: 'div[data-testid="send_message"]',
    answerArticle: 'div[data-testid="receive_message"]',
    userArticleContentEl: 'div[data-testid="message_text_content"]',
    mark: 'div[data-testid="message_content"][data-message-id]',
    markdown: 'div[data-testid="message_text_content"]',
    markdown_ref: 'div[data-testid="ref-content-wrapper"]',
    // answerEndMark: 'div[data-testid="message_action_bar"]',
    answerEndMark: 'div[data-testid="message_action_bar"] button:not([data-testid="message_action_regenerate"])',//刷新按钮：在回复中，也可以出现，当用户鼠标over时。
  })

  static updateSelectors(selectors) {
    if(!selectors) return

    TreeCreator_doubao.#selectors = Object.freeze({...TreeCreator_doubao.#selectors,...selectors})
  }

  static async #createUlByReplying({ isDeep, $ul, li, userArticle, answerArticle, continuator = undefined }) {
    await TreeCreatorBase.createUlByReplying({ isDeep, $ul, li, userArticle, answerArticle }, {
      getMarkdown: TreeCreator_doubao.#getMarkdown,
      getAnswerMark: TreeCreator_doubao.#getAnswerMark,
      getAnswerByUserArticle: TreeCreator_doubao.#getAnswerByUserArticle,
      getEndMark: TreeCreator_doubao.#getEndMark
    }, continuator)
  }

  static async updateTreeByMutation($ul, isDeep, obj) {
    const { type, articleParent } = obj
    if (type === 'load') {
      const articles = articleParent ? Array.from(articleParent.children).filter(el => {
        return TreeCreator_doubao.#isUserArticle(articleParent, el) || TreeCreator_doubao.#isReplyArticle(el)
      }) : []
      console.log('articles', articles)
      if (articles.length > 0) {
        let mark, maxTryTime = 20, curTryTime = 0
        while (!mark && curTryTime < maxTryTime) {
          curTryTime++
          console.log('updateTreeByMutation.while', curTryTime)
          const item = articles.find(el => !el.querySelector(TreeCreator_doubao.#selectors.mark))
          mark = !item
          console.log('mark', mark, item?.outerHTML)
          await wait(1000)
        }
        // console.log('mark', mark, articleParent.outerHTML)
      }
    }

    await TreeCreatorBase.updateTreeByMutation($ul, isDeep, {
      createUlByReplying: TreeCreator_doubao.#createUlByReplying,
      getAnswerByUserArticle: TreeCreator_doubao.#getAnswerByUserArticle,
      isUserArticle: TreeCreator_doubao.#isUserArticle,
      isArticle: TreeCreator_doubao.#isArticle,
      getMarkdown: TreeCreator_doubao.#getMarkdown,
      getUserContentEl: TreeCreator_doubao.#getUserContentEl
    }, obj)
  }

  static regainCreateRootLi(li, isDeep) {
    return TreeCreatorBase.regainCreateRootLi(li, isDeep, TreeCreator_doubao.#getMarkdown, TreeCreator_doubao.#getAnswerByUserArticle)
  }

  static #getAnswerByUserArticle(userArticle) {
    let isRequestPlaceholder = false
    let answerArticle = userArticle?.nextElementSibling
    const isReply = !!TreeCreator_doubao.#isReplyArticle(answerArticle)
    if (isReply) {
      isRequestPlaceholder = !TreeCreator_doubao.#getEndMark(answerArticle)
    } else {
      answerArticle = undefined
    }
    return { answerArticle, isRequestPlaceholder }
  }

  static #isReplyArticle(article) {
    return !!article?.querySelector(TreeCreator_doubao.#selectors.answerArticle)
  }

  static #isUserArticle(articleParent, article) {
    return !!article?.querySelector(TreeCreator_doubao.#selectors.userArticle)
  }

  static #getAnswerMark(answerArticle) {
    return answerArticle
  }

  static #getEndMark(answerArticle) {
    return answerArticle?.querySelector(TreeCreator_doubao.#selectors.answerEndMark)
  }

  static #getMarkdown(answerArticle) {
    const markdown = answerArticle?.querySelector(TreeCreator_doubao.#selectors.markdown)
    markdown?.setAttribute(TreeCreatorBase.attrs.markdown, '')

    // const markdown_ref = answerArticle?.querySelector(TreeCreator_doubao.#selectors.markdown_ref)
    // markdown_ref?.setAttribute(TreeCreatorBase.attrs.markdownOther,'')

    return markdown
  }

  static #getUserContentEl(userArticle) {
    return userArticle?.querySelector(TreeCreator_doubao.#selectors.userArticleContentEl)
  }

  static #isArticle(articleParent, el) {
    return el.parentElement === articleParent && Array.from(el.classList).some(cla => cla.startsWith('container-')) //&& el.matches('div[class^="container-"]')
  }
}
//@注：getMarkdown是处理文字段落的，可能没有返回值。因为如果是多模态模型，回复可能是图片/视频，而没有文字，就可能没有markdown el.
//所以getMarkdown没有返回值不能报错。

class TreeCreatorBase {
  static leafClass = 'leaf'
  static nodeTypeName = 'f-n-t'
  static nodeTypeValues = Object.freeze({
    deep: 'deep',
    common: 'common',
    deepSelector: `[f-n-t="deep"]`,
    commonSelector: `[f-n-t="common"]`
  })
  static #tags = Object.freeze({
    // strongs: ['STRONG', 'B'],    
    // hx: Object.freeze(['H1', 'H2', 'H3', 'H4', 'H5', 'STRONG', 'B']),
    // hx_extend: Object.freeze(['H1', 'H2', 'H3', 'H4', 'H5', 'STRONG', 'B', 'OL', 'UL']),
    hx: Object.freeze(['H1', 'H2', 'H3', 'H4', 'H5']),
    hx_extend: Object.freeze(['H1', 'H2', 'H3', 'H4', 'H5', 'OL', 'UL']),
    list: Object.freeze(['OL', 'UL'])
  })
  static attrs = Object.freeze({
    userContent: 'deep-nav-tree-user-content',
    markdown: 'deep-nav-tree-answer-markdown',
    // markdownImage: 'deep-nav-tree-answer-markdown-image',
    // markdownVideo: 'deep-nav-tree-answer-markdown-video',
    // markdownRead: 'deep-nav-tree-answer-markdown-read',
    // markdownEntry: 'deep-nav-tree-answer-markdown-entry',
    markdownOther: 'deep-nav-tree-answer-markdown-other'
  })
  static get processedMark() {
    return 'processed'
  }//用get属性，外部就无法改变它了
  static loadingClass = 'loading'
  static maxTryTime = 20
  static #createChildUl(li) {
    const ul = document.createElement('ul')
    li.appendChild(ul)
    li.classList.remove(TreeCreatorBase.leafClass)
    return ul
  }

  static #createLeafLi(el, scrollTarget, listOrder = '', isRoot, fromList) {//el是包含用户发送的文本的，可能不存在：如果用户发的是纯图片/视频/文件等。
    if (!el) {
      el = scrollTarget
    }

    // let title = el.innerText.slice(0, 300).split(/\n/)[0]
    let title = el.textContent.slice(0, 300).split(/\n/).find(t => t.trim()) || '' //textContent比innerText快
    title = removeEmoji(title)
    let content
    if (title && isColon(title.at(-1))) title = title.slice(0, -1)
    if (listOrder) title = `${listOrder}${title}`

    if (!isRoot && el.constructor !== HTMLHeadingElement) {
      const regResult = title.match(colonRegExp)
      if (!regResult || regResult.index === 0) {
        content = TreeCreatorBase.escapeHtml(title)
      } else {
        content = `${TreeCreatorBase.escapeHtml(title.slice(0, regResult.index))}${title.at(regResult.index)}<span>${TreeCreatorBase.escapeHtml(title.slice(regResult.index + 1))}</span>`
      }
    } else {
      content = TreeCreatorBase.escapeHtml(title)
    }

    const nodeType = fromList ? TreeCreatorBase.nodeTypeValues.deep : TreeCreatorBase.nodeTypeValues.common

    const li = document.createElement('li')
    li.__ref = new WeakRef(scrollTarget)
    scrollTarget.__tree_li_ref = new WeakRef(li) //相互弱关联
    scrollTarget.setAttribute(TreeCreatorBase.nodeTypeName, nodeType)
    // li.setAttribute('title2', title)
    li.classList.add(TreeCreatorBase.leafClass)
    li.setAttribute(TreeCreatorBase.nodeTypeName, nodeType)

    const icon = document.createElement('i')
    const titleName = document.createElement('title-name')
    const fullscreen = document.createElement('full-screen')
    const star = document.createElement('star-svg')

    titleName.innerHTML = content || '[Non-text]' // div.textContent = content
    titleName.setAttribute('title2', title)

    const div = document.createElement('div')
    div.appendChild(icon)
    div.appendChild(titleName)
    div.appendChild(fullscreen)
    div.appendChild(star)

    // li.appendChild(icon)
    li.appendChild(div)

    // if (!fromList) {
    //   TreeCreatorBase.#viewPortObserver?.observe(scrollTarget)
    // }//不监听ul/ol

    // {
    //   const sign = `--${getRandomId()}-el`
    //   li.setAttribute('sign',sign)
    //   scrollTarget.setAttribute('slide-sign',sign)
    // }//锚点定位的锚点值

    return li
  }

  static #createLeafLiByList(ul, $list, level = 10, isOL = false) {
    //@超耗時：ul.style.listStyleType = `${getComputedStyle($list)['list-style-type']} !important`
    Array.from($list.children).forEach((contentLi, i) => {
      const el = contentLi // contentLi.firstChild === contentLi.firstElementChild ? contentLi.firstChild : contentLi
      const li = TreeCreatorBase.#createLeafLi(el, contentLi, isOL ? `${i + 1}. ` : '', false, true) //第三個參數：補全ol的序號
      li.__level = level
      ul.appendChild(li)
    })
  }

  static #createChildenLi(rootLi, items, isDeep) {
    const filterItems = TreeCreatorBase.#filterItems(items, isDeep)

    if (filterItems.length === 0) return false

    const ul = rootLi.children[1] || TreeCreatorBase.#createChildUl(rootLi)
    filterItems.forEach(({ tagName, el }) => {
      // el.setAttribute(classNames.subcatalog, tagName.toLowerCase()) 加这个标记是为了折叠用，但还没做
      const isList = TreeCreatorBase.#tags.list.includes(tagName)
      const level = isList ? 10 : TreeCreatorBase.#tags.hx.indexOf(tagName) + 1
      let curUl = ul
      while (true) {
        const lastLi = curUl.lastElementChild
        if (!lastLi || lastLi.__level >= level) {
          if (isList) {
            TreeCreatorBase.#createLeafLiByList(curUl, el, 10, tagName === 'OL')
          } else {
            const brotherLi = TreeCreatorBase.#createLeafLi(el, el)
            brotherLi.__level = level
            curUl.appendChild(brotherLi)
          }
          break
        } else {
          curUl = lastLi.children[1] || TreeCreatorBase.#createChildUl(lastLi)
          lastLi.classList.remove(TreeCreatorBase.leafClass)
        }
      }
    })

    return true
  }

  static #createRootLi($ul, userArticle, getAnswerByUserArticle, getUserContentEl, index = undefined) {
    const { answerArticle, isRequestPlaceholder } = getAnswerByUserArticle(userArticle)
    // if (!answerArticle) return {}

    let userProcessed = userArticle.hasAttribute(TreeCreatorBase.processedMark)//之前处理过，表示li已存在

    userArticle.setAttribute(TreeCreatorBase.processedMark, 'user')
    answerArticle?.setAttribute(TreeCreatorBase.processedMark, 'reply')
    userArticle.__unanswered = true

    let li
    if (userProcessed) {
      li = Array.from($ul.children).find(li => li.__ref?.deref() === userArticle) //@@如果这里的li找不到，则是意外
    }
    if (!li) {
      li = TreeCreatorBase.#createLeafLi(getUserContentEl(userArticle), userArticle, undefined, true)
      userProcessed = false
    }
    if (!li) {
      console.warn('createRootLi.error：userArticle找不到contentEl', userArticle.outerHTML)
      return {}
    }
    if (answerArticle) {
      li.__reply = answerArticle //new WeakRef(answerArticle) 不能用弱引用
      delete userArticle.__unanswered
    }
    if (!userProcessed) {
      if (index === undefined) {
        $ul.appendChild(li)
      } else {
        const beforeLi = $ul.children.item(index)
        if (beforeLi) {
          beforeLi.before(li)
        } else {
          $ul.appendChild(li)
        }
      }
    }

    return { li, answerArticle, isRequestPlaceholder }
  }

  static regainCreateRootLi(rootLi, isDeep, getMarkdown, getAnswerByUserArticle) {
    delete rootLi.__reply
    rootLi.children[1]?.remove()

    const answerArticle = getAnswerByUserArticle(rootLi.__ref?.deref()).answerArticle
    if (answerArticle) {
      const markdown = getMarkdown(answerArticle)
      if (markdown) {
        TreeCreatorBase.#createChildenLi(rootLi, Array.from(markdown.children), isDeep)
        rootLi.__reply = answerArticle
        answerArticle.setAttribute(TreeCreatorBase.processedMark, 'reply')
      }
    }
    return answerArticle
  }//公共，改变selectors.markdown就行

  static async createUlByReplying({ isDeep, $ul, li, userArticle, answerArticle }, { getMarkdown, getAnswerMark, getAnswerByUserArticle, getEndMark }, continuator = undefined) {

    userArticle.__replying = true

    let lastItem, lastLi
    const createTreeNodeByParseItems = (items) => {
      console.log('createTreeNodeByParseItems', items)
      if (items.length > 0) {
        const result = TreeCreatorBase.#createChildenLi(li, items, isDeep)
        if (result) {
          lastLi.classList.remove(TreeCreatorBase.loadingClass)
          lastLi = li
          while (lastLi.children[1]?.lastElementChild) {
            lastLi = lastLi.children[1]?.lastElementChild
          }
          lastLi.classList.add(TreeCreatorBase.loadingClass)
          $ul.scrollTop = 10000000
        }//向下一个元素设置loading icon
      }
    }//延遲處理每次調用的“最後一個子元素”，以免chat消息未加載完它的内容

    const onEnd = () => {
      console.log('onEnd', lastItem)
      if (lastItem) {
        TreeCreatorBase.#createChildenLi(li, [lastItem], isDeep)
        $ul.scrollTop = 10000000
      }//處理最後一個子element

      delete userArticle.__replying
      lastLi.classList.remove(TreeCreatorBase.loadingClass)
    }

    const dissolveItemRef = (item) => {
      if (item.__tree_li_ref) {
        console.log('dissolveItemRef', item)
        item.__tree_li_ref.deref()?.remove()
        delete item.__tree_li_ref
      }
    }

    const getNextElementSibling = (lastItem) => {
      let nextItem = lastItem?.nextElementSibling
      while (nextItem && (nextItem.constructor === HTMLBRElement || nextItem.constructor === HTMLHRElement)) {
        nextItem = nextItem.nextElementSibling
      }
      return nextItem
    }

    {
      // console.log('createUlByReplying.answerArticle', answerArticle.outerHTML) //@重要：观察新回复一开始的HTML
      {
        lastLi = li
        lastLi.classList.add(TreeCreatorBase.loadingClass)
        $ul.scrollTop = 10000000
      }//解析 开始前

      let currentTime = 0
      let lastLastItem
      let markdownItems = []
      let markEl = getAnswerMark(answerArticle)
      let lastAnswerArticle = answerArticle
      continuator = continuator || (() => {
        const result = userArticle.isConnected && currentTime < TreeCreatorBase.maxTryTime && (!getEndMark(answerArticle) || getNextElementSibling(lastItem))
        if (!result) {
          console.log('continuator.false', userArticle.isConnected, !!getEndMark(answerArticle))
        }
        return result
      }) //userArticle也可能被移除
      while (continuator()) {
        console.log(`while(${currentTime})|answerArticle：`, answerArticle?.isConnected, answerArticle, markEl, userArticle.isConnected)

        if (lastLastItem !== lastItem) {
          lastLastItem = lastItem
          currentTime = 0 //只要能找到lastItem，就可以一直等待
        }

        if (answerArticle?.isConnected && markEl?.isConnected) {
          lastItem = lastItem || getMarkdown(answerArticle)?.firstElementChild
          console.log('lastItem', lastItem?.isConnected, lastItem)
          if (lastItem) {
            // currentTime = 0 //只要能找到lastItem，就可以一直等待
            if (lastItem.isConnected) {
              // currentTime = 0
              dissolveItemRef(lastItem) //如果已处理过(gpt重写el时)，则移除之前的li节点
              let lastNode = lastItem.nextElementSibling
              const items = []
              while (lastNode) {
                if (lastNode.constructor !== HTMLBRElement && lastNode.constructor !== HTMLHRElement) {
                  items.push(lastItem)
                  markdownItems.push(lastItem)
                  lastItem = lastNode//lastItem.nextElementSibling
                }
                lastNode = lastNode.nextElementSibling
              }
              createTreeNodeByParseItems(items)
            } else {//itemEl被移除
              console.log('lastItem被移除；answerArticle的markdown不確定', lastItem)
              while (lastItem && !lastItem.isConnected) {
                dissolveItemRef(lastItem)//移除对应的li                
                lastItem = markdownItems.pop()
              }
              if (!lastItem) {//所有itemEl都被移除了
                lastItem = undefined
                li.children[1]?.remove()
                li.classList.add(TreeCreatorBase.leafClass)
              }
              // else {
              //   currentTime = 0 //重新来
              // }
            }
          }
        } else {//answerArticle被移除或本就不存在
          // if (lastAnswerArticle) {
          //   currentTime = 0
          // }//页面有动作(dom移除操作),可以继续等

          //注：这里获取的answerArticle可能是undefined
          answerArticle = getAnswerByUserArticle(userArticle).answerArticle
          lastAnswerArticle = answerArticle

          markEl = getAnswerMark(answerArticle)
          lastItem = undefined

          li.__reply = answerArticle //new WeakRef(answerArticle)
          li.children[1]?.remove()
          li.classList.add(TreeCreatorBase.leafClass)
          console.log('answerArticle被移除或不存在,重新来……', answerArticle)
        }

        currentTime++
        await wait(1000)
      }

      console.log('exit while', currentTime)
      onEnd()
    }//通过每隔一秒的轮询，解析最新items(elements)，创建树节点

  }//@據正在進行的回答，添加新消息的树节点

  static async updateTreeByMutation($ul, isDeep, { createUlByReplying, getAnswerByUserArticle, isUserArticle, isArticle, getMarkdown, getUserContentEl, alterArticleBefore = undefined }, obj) {
    const { type, articleParent, removeArticles, addedArticles } = obj
    if (['clear', 'load'].includes(type)) {
      TreeCreatorBase.clearTree($ul)
    }
    if (type === 'clear' || !articleParent?.isConnected) return

    if (type === 'new') {
      if (alterArticleBefore) {
        alterArticleBefore($ul, obj)
      } else if (removeArticles.length) {
        TreeCreatorBase.clearTreeByRemoveArticles($ul, removeArticles)//先刪除无效的
      }//如果有articleParent child删除，那么tree可能有node要移除:如果删除的是userArticle或answerArticle。
    }

    console.log('articleParent.children.length', articleParent.children.length)
    let userArticles
    if (type === 'load') {
      userArticles = Array.from(articleParent.children).filter(el => isUserArticle(articleParent, el))
    } else {
      userArticles = Array.from(articleParent.children).filter(el => {//獲取user article，同時給所有child標注上processedMark，方便下次查找
        const mark = el.getAttribute(TreeCreatorBase.processedMark)
        if (mark) {//已處理的
          return mark === 'user'
        } else if (isArticle(articleParent, el)) {
          const isUser = isUserArticle(articleParent, el)
          if (!isUser) {
            el.setAttribute(TreeCreatorBase.processedMark, 'reply')
            // el.setAttribute(TreeCreatorBase.processedMark, 'unknown')
          }
          return isUser
        } else {//非article元素，確定不是提問或回答（除非chatgpt.com改變HTML結構）
          el.setAttribute(TreeCreatorBase.processedMark, 'other')
          return false
        }
      })
    }
    userArticles = userArticles.map((el, index) => ({ userArticle: el, index }))
    console.log('userArticles.children.length', userArticles.length)

    const newUserArticles = userArticles.filter(({ userArticle }) => {
      return !userArticle.hasAttribute(TreeCreatorBase.processedMark) || userArticle.__unanswered
    })
    console.log('newUserArticles.length', newUserArticles.length)
    const articleParams = newUserArticles.map(({ userArticle, index }) => {
      const { answerArticle, li, isRequestPlaceholder } = TreeCreatorBase.#createRootLi($ul, userArticle, getAnswerByUserArticle, getUserContentEl, index)
      return { userArticle, answerArticle, li, isRequestPlaceholder }
    }).filter(obj => obj.answerArticle)
    console.log('articleParams.length', articleParams.length)
    if (articleParams.length === 0) return

    const firstArticleParams = articleParams[0]

    // if(!firstArticleParams.isRequestPlaceholder){
    //   console.log('firstArticleParams.answerArticle',firstArticleParams.answerArticle.outerHTML)
    // }//调试用的

    if (type === 'new' && articleParams.length === 1) {
      console.log('new articleParams', firstArticleParams, firstArticleParams.answerArticle.textContent)
    }

    if (type === 'new' && articleParams.length === 1 && !firstArticleParams.isRequestPlaceholder) {
      if (firstArticleParams.answerArticle.textContent.length < 20) {
        // debugger
        // chrome.runtime.sendMessage({ type: 'accident', data: { desc: 'replying解析可能失效', replyHtml: firstArticleParams.answerArticle.outerHTML } })
      }
    }

    // const isReplying = type === 'new' && articleParams.length === 1 && firstArticleParams.isRequestPlaceholder //注：正在回复的提问只会有一个
    const isReplying = articleParams.length === 1 && firstArticleParams.isRequestPlaceholder //注：正在回复的提问只会有一个
    if (isReplying) {
      const { li, userArticle, answerArticle } = firstArticleParams
      await createUlByReplying({ isDeep, $ul, li, userArticle, answerArticle })
    } else {
      articleParams.forEach(({ answerArticle, li }) => {
        const markdown = getMarkdown(answerArticle)
        if (!markdown) return //1.意外；2.不是意外，多模态模型，可能是图片/视频
        TreeCreatorBase.#createChildenLi(li, Array.from(markdown.children), isDeep)
      })
    }

  }//@公共和非公共 代码

  static clearTreeByRemoveArticles($ul, removeArticles) {
    if (removeArticles?.constructor === Array) {
      Array.from($ul.children).forEach(li => {
        const ref = li.__ref.deref()
        const reply = li.__reply//?.deref()
        if (!ref || !ref.isConnected) {
          TreeCreatorBase.removeLi(li)
        }//提問已移除 則將對應的li移除
        else if (ref.__replying) {
          console.log('正在處理中，不能删除该tree node')
        }//提問未移除，而回答进行中……，则它的對應节点不做處理，等待处理完成
        else if (reply && !reply.isConnected) {//@注意：提問不一定有回答
          TreeCreatorBase.removeLi(li)
        }//如果回答被移除，則li也移除；后面的代码会重新添加回
      })
    }
  }//刪除无效li+aricle

  static clearTree($ul) {
    Array.from($ul.querySelectorAll('li')).forEach(li => TreeCreatorBase.removeLi(li))
    // Array.from($ul.children).forEach(li => TreeCreatorBase.removeLi(li))
    $ul.innerHTML = ''
  }//清空tree和articles的标记

  static removeLi(li) {
    const ref = li.__ref?.deref() //__ref=空，@则是意外
    const reply = li.__reply//removeAttribute(globalClassNames.collapsed)
    if (reply) {
      reply.removeAttribute(TreeCreatorBase.processedMark)
      reply.removeAttribute(globalClassNames.collapsed)
    }
    if (ref) {
      ref.removeAttribute(TreeCreatorBase.processedMark)
      ref.removeAttribute(globalClassNames.collapsed)
      ref.removeAttribute(TreeCreatorBase.nodeTypeName)
      delete ref.__tree_li_ref
    }

    delete li.__reply //__reply是强引用，必须delete
    delete li.__ref //__ref是弱引用，可以不用delete

    li.remove()
  }

  static #filterItems(items, isDeep) {
    const tagNames = isDeep ? TreeCreatorBase.#tags.hx_extend : TreeCreatorBase.#tags.hx
    return items.map(el => {
      let tagName = el.tagName.toUpperCase()
      if (tagNames.includes(el.tagName)) {
        return { tagName, el }
      } 
      // else if (el.childNodes.length === 1 && el.firstChild?.tagName) {
      //   tagName = el.firstChild.tagName.toUpperCase()
      //   if (TreeCreatorBase.#tags.strongs.includes(tagName)) {
      //     return { tagName, el }
      //   }
      // }
      return undefined
    }).filter(t => t)
  }//@重要，决定解析哪些元素

  static escapeHtml(unsafe = '') {
    const map = Object.freeze({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })

    return unsafe.replace(/[&<>"']/g, m => map[m])
  }
}

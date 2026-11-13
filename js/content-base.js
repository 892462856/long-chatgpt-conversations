
//#region 通用工具函數
const treeObserver = (el, callback, subtree) => {
  const observer = new MutationObserver((mutations, observer) => {
    // setTimeout(()=>{
    callback(mutations, observer)
    // }, 0)
  })
  observer.observe(el, { childList: true, subtree })
  return observer
}
//#endregion

class MainBase {
  static attrs = Object.freeze({
    main: 'deep-nav-tree-main',
    top: 'deep-nav-tree-top',
    bottom: 'deep-nav-tree-bottom',
    articleParent: 'deep-nav-tree-articles',
    scroller: 'deep-nav-tree-scroller',
    hideFloater: 'tree-hide-floater'
  })

  get scrollY(){
    return 0
  }

  #el = undefined
  #observing = false
  #changeHandle
  #usableHandles = []

  #childrenObs
  #subtreeObs
  #timeObs
  #scroller
  #onScrollerChange = () => { }
  set onScrollerChange(fn) {
    this.#onScrollerChange = fn
    if (this.#scroller) {
      this.#onScrollerChange(this.#scroller)
    }
  }

  constructor(isKeep = true) {
    this.#keep(isKeep)
  }
  #keep(isKeep) {
    this.#reset()

    if (!isKeep) return

    const status = this.el?.isConnected
    elementConnectedListener(this.el || {}, () => {
      if (status) {
        console.log('main被刪除')
        this.launchChangeEvent({ type: 'clear', log: 'main被删除' })
      }//status的作用：避免重复执行changeHandle
      this.#keep(isKeep)
    }, 2000)
  }
  set onArticleChange(fn) {
    if (fn && typeof (fn) !== 'function') return

    this.#changeHandle = fn

    if (!this.#observing) {
      this.#restartObserver()
    }
  }
  set onUsable(fn) {
    if (!fn || typeof (fn) !== 'function') return

    this.#usableHandles.push(fn)
    if (this.el && this.el.isConnected) {
      this.#usableHandles.forEach(fn => fn(this.el))
    }
  }

  getMainEl() {
    return undefined
  }
  getArticleParent(selectors) {
    let parent = this.el
    selectors.forEach(({ type, para }) => {
      if (type === 'query') {
        parent = parent?.querySelector(para)
      } else if (type === 'queryAll') {
        parent = parent?.querySelectorAll(para)
      } else if (type === 'closest') {
        const paras = para ? JSON.parse(`[${para}]`) : []
        parent = parent?.closest(...paras)
      } else if (type === 'prop') {
        parent = parent?.[para]
      } else if(type === 'sup'){
        parent = findAncestor(parent[0],parent[1])
      }
    })
    if (!parent) return undefined

    parent.setAttribute(MainBase.attrs.articleParent, '')
    this.setScroller(parent)
    return parent
  }
  setScroller(articleParent) {
    let scroller = articleParent
    while (scroller) {
      const overflowY = getComputedStyle(scroller).overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') {
        scroller.setAttribute(MainBase.attrs.scroller, '')
        break
      }
      scroller = scroller.parentElement
    }

    if (this.#scroller !== scroller) {
      this.#scroller = scroller
      this.#onScrollerChange(scroller)
    }

    return scroller
  }
  setMarks() { }//设置main/top/bottom元素的attribute标记

  // #lastUrlPathname
  #curUrlPathname
  launchChangeEvent(obj) {
    if (this.#changeHandle) {
      if (['load', 'new'].includes(obj.type)) {
        if (this.#curUrlPathname !== location.pathname) {
          this.#curUrlPathname = location.pathname
          obj.type = 'load'
          // obj.newChat = true //newChat是调试用的
        }
      }

      this.#changeHandle(obj)
    }
  }
  #restartObserver() {
    if (this.#childrenObs) {
      this.#childrenObs.disconnect()
      this.#childrenObs = undefined
    }
    if (this.#subtreeObs) {
      this.#subtreeObs.disconnect()
      this.#subtreeObs = undefined
    }
    this.#timeObs && this.#timeObs()

    this.#observing = false

    if (!this.el?.isConnected || !this.#changeHandle) return

    const lookForArticlesByParent = (articleParent) => {
      this.#childrenObs = treeObserver(articleParent, (mutations) => {
        const removeArticles = Array.from(mutations).map(({ removedNodes }) => {
          return Array.from(removedNodes)
        }).flat().filter(t => !([Text, Comment].includes(t.constructor)))
        const addedArticles = Array.from(mutations).map(({ addedNodes }) => {
          return Array.from(addedNodes)
        }).flat().filter(t => !([Text, Comment].includes(t.constructor)))

        if (removeArticles.length && !articleParent.children.length) {
          this.launchChangeEvent({ type: 'clear', log: '删除了所有children' })
        } else if (addedArticles.length !== 1 && addedArticles.length === articleParent.children.length) {
          this.launchChangeEvent({ type: 'load', articleParent, log: '新增所有children' })
        } else {
          this.launchChangeEvent({ type: 'new', articleParent, removeArticles, addedArticles })
        }
      }, false)

      this.#timeObs = elementConnectedListener(articleParent, () => {
        this.#timeObs = undefined
        if (this.#childrenObs) {
          this.#childrenObs.disconnect()
          this.#childrenObs = undefined
        }
        this.launchChangeEvent({ type: 'clear', log: 'articleParent被删除' })

        this.#restartObserver()
        // lookForArticleParent() 不能用lookForArticleParent，有時候加載太快 監聽會錯過，所以用restartObserver（先判斷articleParent是否已存在(加載)）
      })
    }//寻找articleParent的children

    const lookForArticleParent = () => {
      this.#subtreeObs = treeObserver(this.el, () => {
        const articleParent = this.getArticleParent()
        if (articleParent) {
          console.log(`找到articleParent`)
          if (this.#subtreeObs) {
            this.#subtreeObs.disconnect()
            this.#subtreeObs = undefined
          }

          this.launchChangeEvent({ type: 'load', articleParent, log: '找到新的articleParent' }) //当获取到articleParent时，articleParent里面包含了一个新的“结构基本完整”的article（.ds-markdown--block）。

          lookForArticlesByParent(articleParent)
        }
      }, true)
    }//寻找articleParent

    const articleParent = this.getArticleParent()
    if (articleParent) {
      lookForArticlesByParent(articleParent)
      this.launchChangeEvent({ type: 'load', articleParent, log: '开始,存在articleParent' })
    } else {
      lookForArticleParent()
    }

    this.#observing = true
  }

  get el() {
    return this.#el
  }

  #reset() {
    this.#el = this.getMainEl()
    this.#restartObserver()

    if (!this.el || !this.el.isConnected) return

    this.setMarks() //设置main/top/bottom元素的标记

    this.#usableHandles.forEach(fn => fn(this.el))
  }

  listenerUrlChange(callback) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const { type, data } = message
      if (type === 'page-updated') {
        callback(data)
      }
    })
  }//监听chatId的改变（来自URL）

  _generateMarkdownByElement(el) {
    const turndownService = new TurndownService()
    TurndownGfm(turndownService)
    const markdown = turndownService.turndown(el.outerHTML)
    // const markdown = mdream.htmlToMarkdown(h.outerHTML)
    return markdown
  }
  _generateQueryMarkdonw(query, name = undefined) {
    let title = name || truncateByBytes(query.textContent, 35).replace(/\n/g,' ')
    title = `# ${title || '[non-text]'}`
    const say = `\`\`\`Me
${query.innerText || '[non-text]'}
\`\`\``
    return `${title}\n${say}`
  }
  async generateMarkdown(options) {
    const mds = options.map(({ li, name }) => {
      const ref = li.__ref?.deref()//?.cloneNode(true) 不能用cloneNode，因为样式(如：换行)丢失
      const reply = li.__reply

      if(!reply) return []

      const query = ref.querySelector('[deep-nav-tree-user-content]')

      const queryMd = this._generateQueryMarkdonw(query, name)
      const replyMd = reply && this._generateMarkdownByElement(reply)
      return [queryMd, replyMd, '******']
    }).flat().filter(t=>t).slice(0,-1)

    return mds.join('\n\n')

    // const els = options.map(({ li }) => {
    //   const ref = li.__ref?.deref()//?.cloneNode(true) 不能用cloneNode，因为样式(如：换行)丢失
    //   const reply = li.__reply?.cloneNode(true)

    //   const el = ref?.querySelector('[deep-nav-tree-user-content]')
    //   if (ref) {
    //     const h1 = document.createElement('h1')
    //     h1.textContent = truncateByBytes(el.textContent, 35)

    //     const pre = document.createElement('pre')
    //     const code = document.createElement('code')
    //     code.setAttribute('class', 'language-Say')
    //     pre.appendChild(code)
    //     code.textContent = ref.innerText

    //     ref.innerHTML = ''
    //     ref.appendChild(h1)
    //     ref.appendChild(pre)
    //   }

    //   // reply?.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(el => {
    //   //   const n = parseInt(el.tagName.slice(1)) + 1
    //   //   const h = document.createElement(`h${n}`)
    //   //   Array.from(el.attributes).forEach(attr => {
    //   //     h.setAttribute(attr.name, attr.value)
    //   //   })
    //   //   h.innerHTML = el.innerHTML
    //   //   el.before(h)
    //   //   el.remove()
    //   // })

    //   return [ref, reply, document.createElement('hr')].filter(t => t)
    // }).flat()//HTML整理

    // const div = document.createElement('div')
    // els.forEach(el => div.appendChild(el))
    // console.log(div.outerHTML)

    // return this.generateMarkdownByElement(div)
  }

  // obs() {
  //   const observer = new IntersectionObserver((entries) => {
  //     entries.forEach(entry => {
  //       // entry.target
  //       if (entry.intersectionRatio > 0) {
  //       } else {
  //       }
  //     })
  //   }, { threshold: [0], rootMargin: '0px' }) // 创建观察器

  //   // answers.forEach(answer => observer.observe(answer)) // 观察所有回答元素
  //   // observer.disconnect()
  // }
}

// history.pushState({ page: 1 }, "Page 1", "/page1");
// history.back()
// history.forward()


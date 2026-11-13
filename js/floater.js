const alert2 = Alert2(() => (document.body.querySelector(':scope > div.catalogeu-navigation-plugin-floatbar')))

const childrenToMap = (children) => Object.fromEntries(Array.from(children).map(el => ([el.classList[0], el])).filter(([key, el]) => key))
//1.guide多语言；2.申请延长试用；3.禁用按钮点击时弹出订阅提示
class Floater {
  static #classNames = Object.freeze({
    showPanel: 'show-panel',
    hover: 'hover',
    inactive: 'inactive',
    deep: 'deep',
    open: 'open',
    stop: 'stop',
    over: 'over'
  })
  static #attrs = Object.freeze({
    pinAttrName: 'catalogeu-navigation-plugin-floatbar-panel-pin',
    wide: 'deep-nav-tree-wide',
    hideheadbar: 'deep-nav-tree-hideheadbar', //同时用做attribute，所以不能用驼峰
    hidespeakbox: 'deep-nav-tree-hidespeakbox',
    export: `deep-nav-tree-export`,
    performanceMode: 'deep-nav-tree-performance-mode'
  })
  static #consts = Object.freeze({
    shortcutkeyCacheKey: 'shortcutKeys'
  })
  static #cacheObj
  static undisplaySelectors
  static TreeCreator
  static #svgs = {}
  static #el
  static #loading = false
  static #chatId
  static #onShowFn = new Set()
  static #onHideFn = new Set()
  static #onShow(fn) {
    Floater.#onShowFn.add(fn)

    if (Floater.#isShow) fn()
  }
  static #onHide(fn) {
    Floater.#onHideFn.add(fn)

    if (!Floater.#isShow) fn()
  }
  static #offShow(fn) {
    Floater.#onShowFn.delete(fn)
  }
  static #offHide(fn) {
    Floater.#onHideFn.delete(fn)
  }

  static get #isShow() {
    return Floater.#isFixed || Floater.#el.classList.contains(Floater.#classNames.hover)
  }

  static get #isFixed() {
    return Floater.#el.classList.contains(Floater.#classNames.showPanel)
  }

  static #show(value) {//value：-1，绝对隐藏 ；0，隐藏（只移除hover class，不一定隐藏）；1，临时显示；2，固定
    if ([1, 2].includes(value) && Floater.#isFixed) return //防止重复执行，以下同理

    const hovered = Floater.#el.classList.contains(Floater.#classNames.hover)

    if (value === -1) {
      if (!Floater.#isFixed && !hovered) return

      Floater.#el.classList.remove(Floater.#classNames.showPanel, Floater.#classNames.hover)
      Floater.#cacheObj.show = value
    } else if (value === 0) {
      if (!hovered) return

      Floater.#el.classList.remove(Floater.#classNames.hover)

      if (Floater.#isFixed) return //实际未隐藏，不执行下面的onHide
      Floater.#cacheObj.show = value
    } else if (value === 1) {
      if (Floater.#isFixed || hovered) return

      Floater.#el.classList.add(Floater.#classNames.hover)
      Floater.#cacheObj.show = value
    } else if (value === 2) {
      if (Floater.#isFixed) return

      Floater.#el.classList.add(Floater.#classNames.showPanel)
      Floater.#el.classList.remove(Floater.#classNames.hover)
      Floater.#cacheObj.show = value
    }

    if ([-1, 0].includes(value)) {
      Floater.#onHideFn.forEach(fn => fn())
    } else if ([1, 2].includes(value)) {
      Floater.#onShowFn.forEach(fn => fn())
    }
  }

  static async create(main, getNewButton) {
    if (Floater.#el) return

    const { el, $buttonbar, $panel, $title, $header, $ul, $scrollPrompt, $titlebox, buttons, title, header } = await Floater.#createUi()
    const cacheObj = await Floater.#getCache()
    Floater.#cacheObj = cacheObj

    Floater.TreeCreator.getDeepValue = () => cacheObj.isDeep

    Floater.#el = el
    Floater.#initUiByCache({ $panel, $ul, header, title, $buttonbar }, cacheObj)

    // Floater.#setWideIcon(tools.wide, cacheObj.widescreen)
    Floater.#bindPanelToggle(buttons.catalog, title.close, $panel, $ul, cacheObj)
    // Floater.#bindUserPopup(more.user)
    // Floater.#bindNew(header.new, getNewButton)
    // Floater.#bindWidePattern(tools.wide, cacheObj)
    // Floater.#bindTopBottomToggle(tools.areas, cacheObj)
    // Floater.#bindFullScreen(more.full)
    // Floater.#bindPartialFullscreen([buttons.partial, tools.partial])
    // Floater.#bindExport(more.export, $ul)    
    Floater.#bindPanelDrag($panel, $title, cacheObj, $ul)
    Floater.#bindIconDrag($buttonbar, buttons.catalog, cacheObj, $panel, $ul)
    Floater.#bindPanelResize($panel, cacheObj, $ul)
    Floater.#bindPartialFullscreen([header.full], $panel, $ul)
    Floater.#bindExport(title.down, main, $panel, $ul)
    Floater.#bindReadMode(title.read)

    const navTree = new NavTree({
      $ul,
      isDeep: cacheObj.isDeep,
      navAction: cacheObj.navAction,
      processedMark: TreeCreatorBase.processedMark,
      onRootLiToggle: ({ answer, opened, forceOpen }) => {
        Floater.#setFoldIconByStatus(header.fold, !navTree.folded)
        if (answer && (cacheObj.isSync || forceOpen)) {
          articles.toggleItem(answer, forceOpen || opened)
        }
      },
      updateTreeByMutation: Floater.TreeCreator.updateTreeByMutation,
      regainCreateRootLi: Floater.TreeCreator.regainCreateRootLi,
      onChangeSubOutlineWidth: ({ value }) => {
        cacheObj.subOulineWidth = value
      },
      onCollectStar: ({ opt, item }) => {
        return opt === 'add' ? BookmarkStore.add(item) : BookmarkStore.remove(item.id)
      },
      $titlebox,
      scrollY: main.scrollY
    })

    Floater.#chatId = Floater.#getChatId() || location.pathname
    navTree.stars = await BookmarkStore.list()
    navTree.updateStars()
    Floater.#bindStar(header.star, navTree)

    const [onScrollerChange_gps, scrollPrompt, scrollHeadline] = Floater.#viewPortObserver(navTree, header.gps, main.scrollY, cacheObj)
    // const onScrollerChange_chatAreaScroll = Floater.#bindChatAreaScroll($ul, $scrollPrompt)

    main.onScrollerChange = (scroller) => {
      onScrollerChange_gps(scroller)
      // onScrollerChange_chatAreaScroll(scroller)
    }

    Floater.#bindNavigationAction(header.jmode, $panel, navTree, cacheObj)

    const articles = new Articles({
      $ul,
      onRootNodeOpen: ({ answer }) => {
        if (!cacheObj.isSync) return
        navTree.openRootLiByAnswer(answer)
        Floater.#setFoldIconByStatus(header.fold, !navTree.folded)
      }
    })

    const setAsOpenState = () => {
      Floater.#setFoldIconByStatus(header.fold, true)
      cacheObj.isSync && articles.toggle(true)
    }
    Floater.#bindRefresh(header.refresh, navTree, cacheObj, setAsOpenState, main)
    Floater.#bindDeep(header.deep, navTree, cacheObj, setAsOpenState)
    // Floater.#bindSync(header.sync, cacheObj, navTree, articles, loginByUnpower)
    // Floater.#bindSlide(header.slide, navTree, $ul) 不做滚动了
    Floater.#bindTreeFold(header.fold, navTree, articles, cacheObj)
    Floater.#bindTreePlies(header.plies, navTree, header.fold, cacheObj)
    // Floater.#bindAnswersFold(buttons.fold, articles, navTree, cacheObj)
    Floater.#bindShortcutKeys(title.shortcut, { fold: header.fold, plies: header.plies, refresh: header.refresh, read: title.read, jmode: header.jmode, closeBtn: title.close }, { $panel, $ul, cacheObj }, scrollPrompt, scrollHeadline)

    main.onArticleChange = async (obj) => {
      console.log('onArticleChange', obj)

      const beforeOpened = header.fold.classList.contains(Floater.#classNames.open)

      Floater.#loading = true
      await Floater.TreeCreator.updateTreeByMutation($ul, navTree.isDeep, obj)
      Floater.#loading = false

      // onArticleChangeForSpeed(obj)

      if (obj.type === 'load') {//保持tree和articlede的 折叠/展开 状态
        if (cacheObj.plies) navTree.foldSecondLayer()
        navTree.fold(beforeOpened)
        Floater.#setFoldIconByStatus(header.fold, !navTree.folded)
        // if (!beforeOpened && cacheObj.enableSync && cacheObj.isSync) {
        //   Floater.#syncArticles(navTree, articles)
        // }
      } else if (obj.type !== 'clear') {
        Floater.#setFoldIconByStatus(header.fold, !navTree.folded)
      }

      {
        const chatId = Floater.#getChatId() || location.pathname
        if (Floater.#chatId !== chatId) {
          Floater.#chatId = chatId
          navTree.stars = await BookmarkStore.list()
        }
        navTree.updateStars()
      }//switching conversations: reload bookmarks; otherwise re-apply after tree rebuild

    }//1.通過監聽dom的改變來監聽/更新消息

    Floater.#keep()

  }

  static async #getCache() {
    const hostKey = `${location.hostname}_floater_cache`
    const obj = (await chrome.storage.local.get(hostKey))[hostKey] || {}

    const keys = Object.freeze(['pin', 'show', 'isSync', 'navAction', 'isDeep', 'enableSync', 'enableItemFull', 'enableFull', 'plies', 'panelWidth', 'panelMaxHeight', 'widescreen', 'hideheadbar', 'hidespeakbox', 'buttonbarPos', 'panelPos', 'subOulineWidth'])

    obj.isDeep = false //不使用这个功能了，用户已启用的(也可能无意启用) 清掉。
    /*
    const obj = await chrome.storage.local.get(keys)
    obj.isSync = obj.isSync === undefined ? true : !!obj.isSync //默認為true
    obj.isDeep = obj.isDeep === undefined ? true : !!obj.isDeep
    obj.widescreen = !!obj.widescreen
    obj.hideheadbar = !!obj.hideheadbar
    obj.hidespeakbox = !!obj.hidespeakbox

    obj.buttonbarPos = { right: '20px', top: '50%', ...obj.buttonbarPos }
    obj.panelPos = { right: '0px', top: '0px', ...obj.panelPos }
    */
    obj.buttonbarPos = { ...obj.buttonbarPos }
    obj.panelPos = { ...obj.panelPos }
    obj.navAction = obj.navAction !== false
    obj.enableSync = obj.enableSync === undefined ? true : obj.enableSync //默认true

    const resultObj = {}
    keys.forEach(key => {
      Object.defineProperty(resultObj, key, {
        configurable: false,
        get() {
          return obj[key]
        },
        set(value) {
          obj[key] = value
          chrome.storage.local.set({ [hostKey]: { ...obj } })

          if (key === 'enableSync') {
            const attrName = 'enable-sync'
            if (value) {
              Floater.#el.setAttribute(attrName, '')
            } else {
              Floater.#el.removeAttribute(attrName, '')
            }

            if (!value && this.isSync) {
              this.isSync = false
            }
          } else if (key === 'enableItemFull') {
            const attrName = 'enable-item-full'
            if (value) {
              Floater.#el.setAttribute(attrName, '')
            } else {
              Floater.#el.removeAttribute(attrName, '')
            }
          } else if (key === 'enableFull') {
            const attrName = 'enable-full'
            if (value) {
              Floater.#el.setAttribute(attrName, '')
            } else {
              Floater.#el.removeAttribute(attrName, '')
            }
          } else if (key === 'isSync') {
            if (value) {
              Floater.#el.setAttribute('sync', '')
            } else {
              Floater.#el.removeAttribute('sync')
            }
          }
        }
      })
    })
    Object.defineProperty(resultObj, 'toObj', {
      configurable: false,
      enumerable: false,
      get() {
        return JSON.parse(JSON.stringify(obj))
      }
    })
    console.log('cache', obj, resultObj)

    return Object.freeze(resultObj)
  }//cache区分 大模型(域名)

  static async #createUi() {
    let el

    await fetch(chrome.runtime.getURL('resources/svgs.html')).then(data => data.text()).then(html => {
      const div = document.createElement('div')
      div.innerHTML = html
      Floater.#svgs = Object.fromEntries(Array.from(div.children).map(el => ([el.getAttribute('data-key').replace(/-./g, str => str[1].toUpperCase()), el])))
      Object.freeze(Floater.#svgs)
    })

    await fetch(chrome.runtime.getURL('resources/floater.html')).then(data => data.text()).then(html => {
      el = document.createElement('div')
      el.innerHTML = html
      el = el.firstElementChild

      translate(el)

      {
        el.querySelectorAll('svg[id]').forEach(el => {
          const svg = Floater.#svgs[el.id].cloneNode(true)
          Array.from(el.attributes).forEach(attr => {
            svg.setAttribute(attr.name, attr.value)
          })
          el.replaceWith(svg)
        })
      }//替換svg
    })// 创建floater UI

    const $buttonbar = el.children[0]
    const $panel = el.children[1]
    const { title: $title, header: $header, tree: $ul, 'scroll-prompt': $scrollPrompt } = childrenToMap($panel.children)

    const buttons = childrenToMap($buttonbar.children)
    const title = childrenToMap($title.children)
    const header = childrenToMap($header.querySelectorAll('button[class]')) //childrenToMap($header.children)
    // header.sync = $header.querySelector('.sync-switch>input')

    const $titlebox = el.querySelector(':scope>.titlebox')

    return { el, $buttonbar, $panel, $title, $header, $ul, $scrollPrompt, $titlebox, buttons, title, header }
  }
  static #initUiByCache({ $panel, $ul, header, title, $buttonbar }, cacheObj) {
    cacheObj.panelWidth && ($panel.style.width = `${cacheObj.panelWidth}px`)
    cacheObj.panelMaxHeight && ($panel.style.height = `${cacheObj.panelMaxHeight}px`)
    // !cacheObj.isDeep && header.deep.classList.add(Floater.#classNames.inactive)
    cacheObj.isDeep && header.refresh.classList.add(Floater.#classNames.deep)
    cacheObj.plies && header.plies.classList.remove(Floater.#classNames.open)
    !cacheObj.navAction && header.jmode.classList.add(Floater.#classNames.over)

    cacheObj.enableSync = cacheObj.enableSync //为了设置样式
    cacheObj.enableItemFull = cacheObj.enableItemFull //为了设置样式
    cacheObj.enableFull = cacheObj.enableFull //为了设置样式
    cacheObj.isSync = cacheObj.isSync //为了设置样式

    $buttonbar.style.right = cacheObj.buttonbarPos.right
    $buttonbar.style.top = cacheObj.buttonbarPos.top
    $panel.style.right = cacheObj.panelPos.right
    $panel.style.top = cacheObj.panelPos.top
    // if (cacheObj.subOulineWidth) {
    //   $ul.style.setProperty('--sub-outline-width', cacheObj.subOulineWidth)
    // }

    cacheObj.show === 2 && Floater.#show(2)
    cacheObj.pin && Floater.#setPin($panel, true, cacheObj)


    /*//根據chrome.storage保存的shows初始化 上/下/寬屏 的顯示/隱藏
    if (cacheObj.widescreen) {
        document.body.setAttribute(Floater.#attrs.wide, '')
    } else {
        document.body.removeAttribute(Floater.#attrs.wide)
    }
    if (cacheObj.hideheadbar) {
        document.body.setAttribute(Floater.#attrs.hideheadbar, '')
    } else {
        document.body.removeAttribute(Floater.#attrs.hideheadbar)
    }
    if (cacheObj.hidespeakbox) {
        document.body.setAttribute(Floater.#attrs.hidespeakbox, '')
    } else {
        document.body.removeAttribute(Floater.#attrs.hidespeakbox)
    }*/

    {
      const cacheKey = this.#consts.shortcutkeyCacheKey
      chrome.storage.local.get(cacheKey).then(({ [cacheKey]: cacheKeys }) => {
        cacheKeys = cacheKeys || {}

        const inputs = Array.from(title.shortcut.querySelectorAll('input[type="text"][action-name]')).map(el => ({
          key: el.value.trim().toUpperCase(),
          name: el.getAttribute('action-name'),
          input: el
        }))
        const checkeds = Array.from(title.shortcut.querySelectorAll('input[type="checkbox"][action-name]')).map(el => {
          return el.getAttribute('action-name').split(',').map(name => ({ checkbox: el, name, checked: el.checked }))
        }).flat()

        const initList = checkeds.map(({ checkbox, name, checked }) => {
          const { key, input } = inputs.find(t => t.name === name) || { key: name, input: undefined } ////鼠标滚轮快捷操作 没有输入框input:text
          return { name, key, checked, input, checkbox }
        })

        Object.entries(cacheKeys).forEach(([key, { name, checked }]) => {
          const item = initList.find(t => t.name === name)
          if (item) {
            item.key = key
            item.checked = checked
            if (item.checkbox) {
              item.checkbox.checked = checked
            }
            if (item.input) {
              item.input.value = key
            }
          }
        })

        const obj = Object.fromEntries(initList.map(({ key, name, checked }) => ([key, { name, checked }])))
        chrome.storage.local.set({ [cacheKey]: obj })
      })
    }//快捷键缓存 to html | html to 快捷键缓存
  }//init:用cache还原floater界面

  static #uninstalled = false
  static #keep() {
    if (Floater.#uninstalled) return
    document.body.appendChild(Floater.#el)
    elementConnectedListener(Floater.#el, () => {
      console.log(`floater被刪除`)
      Floater.#keep()
    }, 3000) //如果Floater.#el被移除就重新appendChild；不用MutationObserver
  }

  static #getChatId() {
    return getChatIdByLocation()
  }

  static #bindWidePattern(button, cacheObj) {//button=tools.wide
    button.addEventListener('click', (e) => {
      e.stopPropagation()

      cacheObj.widescreen = !cacheObj.widescreen
      Floater.#setWideIcon(button, cacheObj.widescreen)

      if (cacheObj.widescreen) {
        document.body.setAttribute(Floater.#attrs.wide, '')
      } else {
        document.body.removeAttribute(Floater.#attrs.wide)
      }
    })
  }//绑定 宽屏模式

  static #bindTopBottomToggle(button, cacheObj) {//button=tools.areas
    const bars = Object.freeze({
      top: button.children[0].children[0],
      bottom: button.children[0].children[1]
    })
    const barButtons = [[bars.top, 'hideheadbar', Floater.#attrs.hideheadbar], [bars.bottom, 'hidespeakbox', Floater.#attrs.hidespeakbox]]
    barButtons.forEach(([bar, key, attrName]) => {
      bar.addEventListener('click', () => {
        cacheObj[key] = !cacheObj[key]
        if (cacheObj[key]) {
          document.body.setAttribute(attrName, '')
        } else {
          document.body.removeAttribute(attrName)
        }
      })
    })
  }//绑定 顶部/底部(聊天输入框) 顯示/隱藏 事件

  static #bindNew(button, getNewButton) {//button=header.new
    if (!getNewButton) {
      button.style.display = 'none'
      return
    }
    setTimeout(() => {
      if (!getNewButton()) {
        button.style.display = 'none'
      } else {
        button.addEventListener('click', () => {
          getNewButton()?.click()
        })
      }
    }, 2000) //找到页面的new chat按鈕則顯示"新聊天"按鈕，否則隱藏 
  }//绑定"新聊天"事件

  static #bindAnswersFold(button, articles, navTree, cacheObj) {//button=buttons.fold
    button.addEventListener('click', (e) => {
      e.stopPropagation()

      articles.toggle()

      if (cacheObj.isSync) {
        navTree.fold(articles.folded)
      }
    })//全部回答 折叠/展开
  }//绑定 回复的折叠/展开

  static #bindTreeFold(button, navTree, articles, cacheObj) {//button=header.fold
    button.addEventListener('click', (e) => {
      e.stopPropagation()

      if (e.target.closest('.sync-content')) return

      // navTree.toggleFold(e.ctrlKey)
      navTree.toggleFold(false)
      const opened = !navTree.folded
      Floater.#setFoldIconByStatus(button, opened)
      if (cacheObj.isSync) {
        articles.toggle(opened)
      }
    })//递归 摺叠/展開
  }//绑定 树的折叠/展开

  static #bindTreePlies(btn, navTree, foldBtn, cacheObj) {
    btn.onclick = () => {
      // if (Floater.#power < 0) return

      const shallow = btn.classList.contains(Floater.#classNames.open)
      if (shallow) {
        btn.classList.remove(Floater.#classNames.open)
      } else {
        btn.classList.add(Floater.#classNames.open)
      }
      cacheObj.plies = shallow
      navTree.togglePlies(shallow)
      Floater.#setFoldIconByStatus(foldBtn, true)
    }
  }

  static #bindStar(button, navTree) {
    button.addEventListener('click', () => {
      const showOnly = button.classList.contains(Floater.#classNames.inactive)
      navTree.showOnlyStars(showOnly)
      button.classList.toggle(Floater.#classNames.inactive, !showOnly)
    })
  }//toggle "only bookmarks" view

  static #bindDeep(button, navTree, cacheObj, callback) {//button=header.deep
    button.addEventListener('click', () => {
      if (Floater.#loading) return

      const result = navTree.toggleDeep()
      if (result) {
        cacheObj.isDeep = navTree.isDeep
        if (cacheObj.isDeep) {
          button.classList.remove(Floater.#classNames.inactive)
        } else {
          button.classList.add(Floater.#classNames.inactive)
        }
        callback()
      }
    }) //切换解析深度+重新解析
  }//绑定deep的切换

  static #bindRefresh(button, navTree, cacheObj, callback, main) {//button=header.deep
    button.addEventListener('click', () => {
      if (Floater.#loading) return

      const result = navTree.toggleDeep(main.getArticleParent())
      if (result) {
        cacheObj.isDeep = navTree.isDeep
        if (cacheObj.isDeep) {
          button.classList.add(Floater.#classNames.deep)
        } else {
          button.classList.remove(Floater.#classNames.deep)
        }
        callback()
      }
    }) //切换解析深度+重新解析
  }//绑定deep的切换

  static #bindRefresh_x(button, navTree, callback) {//button=header.refresh
    button.addEventListener('click', () => {
      if (Floater.#loading) return

      navTree.refresh()
      callback()
    })//刷新树
  }//绑定刷新

  static #bindSlide(button, navTree, ul) {//button=header.side
    button.addEventListener('click', () => {
      if (Floater.#loading) return

      const yes = Floater.#el.classList.contains('slide-mode')
      if (yes) {
        Floater.#el.classList.remove('slide-mode')
      } else {
        Floater.#el.classList.add('slide-mode')
      }
      navTree.slide(!yes)
    })
  }//绑定"滚动模式"——不做这个功能！

  static #syncArticles(navTree, articles) {
    navTree.getChildrenInfo().forEach(({ answer, folded }) => {
      articles.toggleItem(answer, !folded)
    })
  }

  static #setWideIcon(button, value) {//button=tools.wide,value=shows.wide
    button.textContent = value ? '] [' : '[　]'
  }//设置 宽屏/非宽屏 的textContent

  static #setFoldIconByStatus(button, opened) {//button=header.fold
    if (opened) {
      button.classList.add(Floater.#classNames.open)
    } else {
      button.classList.remove(Floater.#classNames.open)
    }
  }

  static #openPanel($panel, $ul, cacheObj) {
    Floater.#show(2)
    const { right } = getComputedStyle($panel)
    if (right === '0px') {
      Floater.#setPin($panel, true, cacheObj)
    }

  }

  static #bindPanelToggle(openButton, closeButton, $panel, $ul, cacheObj) {//openButton=buttons.catalog; closeButton=title.close;
    const close = () => {
      if (!Floater.#isFixed) return

      const btns = openButton.parentElement
      btns.style.display = 'block'
      const { right: right2, top: top2 } = getComputedStyle(btns)
      const { right, top } = getComputedStyle($panel)
      $panel.classList.add('hiding')
      $panel.style.right = right2
      $panel.style.top = top2
      setTimeout(() => {
        Floater.#setPin(undefined, false, cacheObj)

        Floater.#show(-1)

        $panel.classList.remove('hiding')
        $panel.style.right = right
        $panel.style.top = top
        btns.style.display = ''

      }, 100)
    }
    closeButton.addEventListener('click', close) //隐藏
    closeButton.addEventListener('mousedown', e => { e.stopPropagation() })

    let timeId_hide
    Array.from([openButton, $panel]).forEach(el => {
      el.addEventListener('mouseenter', (e) => {
        if (e.buttons !== 0) return //防住和#bindIconDrag冲突

        clearTimeout(timeId_hide)
        Floater.#show(1)
      })
      el.addEventListener('mouseleave', () => {
        timeId_hide = setTimeout(() => {
          Floater.#show(0)
        }, 150)
      })
    })//添加.hover class，實現$panel延遲消失
  }//顯示/隱藏 $panel

  static #setPin($panel, yes, cacheObj) {
    const pinAttrName = Floater.#attrs.pinAttrName
    if (yes) {
      document.body.setAttribute(pinAttrName, '')
      $panel.style.right = '0px'
      $panel.style.top = '0px'
      Floater.#show(2) //停靠了，必须显示

      cacheObj.panelPos = { right: '0px', top: '0px' } //设置缓存

      {
        // const tags = document.elementsFromPoint(innerWidth - 1, parseInt(innerHeight / 2)).map(el => {
        //   if (el.constructor === HTMLHtmlElement) return
        //   if (Floater.#el.contains(el)) return
        //   return `${el.tagName}:${el.className}`
        // }).filter(t => t)
        // if (tags.length) {
        //   chrome.runtime.sendMessage({ type: 'accident', data: { desc: '大纲栏停靠时遮住了内容', tags: tags.join('\n') } })
        // }
      }//@检查"停靠"有没有问题      
    } else {
      document.body.removeAttribute(pinAttrName)
    }
    Floater.#cacheObj.pin = !!yes
  }

  static #bindPanelDrag($panel, el, cacheObj, $ul) {//el=$title
    forPress({
      el,
      down(e, obj) {
        if (e.target.closest('.shortcut')) return false //快捷键面板，不许拖拽

        const { right, top, width, height } = getComputedStyle($panel)
        obj.startRight = parseFloat(right)
        obj.startTop = parseFloat(top)
        obj.maxRight = window.innerWidth - parseFloat(width)
        obj.maxTop = window.innerHeight - 30
        obj.startX = e.clientX
        obj.startY = e.clientY

        $panel.style.transition = 'none'
        // $panel.style.right = 'auto'

        return true
      },
      move(e, obj, first) {
        if (first) {
          Floater.#setPin(undefined, false, cacheObj)
        }

        const deltaX = e.clientX - obj.startX
        const deltaY = e.clientY - obj.startY

        obj.right = Math.max(0, Math.min(obj.startRight - deltaX, obj.maxRight))
        obj.top = Math.max(0, Math.min(obj.startTop + deltaY, obj.maxTop))
        $panel.style.right = `${obj.right}px`
        $panel.style.top = `${obj.top}px`

        if (obj.right === 0) {
          Floater.#el.classList.add(Floater.#classNames.stop)
        } else {
          Floater.#el.classList.remove(Floater.#classNames.stop)
          Floater.#setPin(undefined, false, cacheObj)
        }
      },
      up(e, obj, moved) {
        $panel.style.transition = ''
        if (!moved) return

        cacheObj.panelPos = { right: $panel.style.right, top: $panel.style.top }

        if (obj.right === 0) {
          Floater.#setPin($panel, true, cacheObj)
        } else {
          Floater.#show(2)
        }
        Floater.#el.classList.remove(Floater.#classNames.stop)

      }
    })
  }//绑定 panel拖拉移動事件

  static #bindIconDrag($buttonbar, el, cacheObj, $panel, $ul) {//el=buttons.catalog
    forPress({
      el,
      down(e, obj) {
        $buttonbar.classList.add('moving')

        const { right, top, width, height } = getComputedStyle($buttonbar)
        obj.startRight = parseFloat(right)
        obj.startTop = parseFloat(top)
        obj.maxRight = window.innerWidth - parseFloat(width)
        obj.maxTop = window.innerHeight - parseFloat(height)
        obj.startX = e.clientX
        obj.startY = e.clientY

        $buttonbar.style.transition = 'none'
        // $buttonbar.style.right = 'auto'

        return true
      },
      move(e, obj) {
        Floater.#show(-1) //如果移动icon则不要显示panel,以免干扰用户的移动操作。

        const deltaX = e.clientX - obj.startX
        const deltaY = e.clientY - obj.startY

        const right = Math.max(0, Math.min(obj.startRight - deltaX, obj.maxRight))
        const top = Math.max(0, Math.min(obj.startTop + deltaY, obj.maxTop))
        $buttonbar.style.right = `${right}px`
        $buttonbar.style.top = `${top}px`
      },
      up(e, obj, moved) {
        $buttonbar.classList.remove('moving')
        $buttonbar.style.transition = ''

        if (!moved) {
          Floater.#openPanel($panel, $ul, cacheObj) //"click"则打开panel
          return
        }

        cacheObj.buttonbarPos = {
          right: $buttonbar.style.right,
          top: $buttonbar.style.top
        }

      }
    })
  }//绑定 ICON拖拉移動事件

  static #bindPanelResize($panel, cacheObj, $ul) {
    Array.from($panel.children).filter(el => el.classList.contains('resizebar')).forEach(el => {
      const isRight = el.classList.contains('resizebar-right')
      forPress({
        el,
        down: ({ clientX }, obj) => {
          obj.startX = clientX
          obj.startWidth = parseInt(getComputedStyle($panel).width)
          if (isRight) {
            obj.startRight = parseInt(getComputedStyle($panel).right)
            obj.minWidth = parseInt(getComputedStyle($panel).minWidth)//min-width是固定的，写在css里
          }
          return true
        },
        move: ({ clientX }, obj, first) => {
          if (first) {
            $panel.style.transition = 'none'
          }

          let diffValue = clientX - obj.startX
          if (isRight) {
            const width = Math.max(obj.minWidth, obj.startWidth + diffValue)
            diffValue = width - obj.startWidth

            $panel.style.width = `${width}px`
            $panel.style.right = `${obj.startRight - diffValue}px`
          } else {
            $panel.style.width = `${obj.startWidth - diffValue}px`
          }
        },
        up: (e, obj, moved) => {
          if (!moved) return

          $panel.style.transition = ''
          cacheObj.panelWidth = parseInt($panel.style.width)
          if (isRight) {
            cacheObj.panelPos = { ...cacheObj.panelPos, right: $panel.style.right }
          }

          Floater.#show(2)

        }
      })
    })

    Array.from($panel.children).filter(el => el.classList.contains('resizebar2')).forEach(el => {
      const isBottom = el.classList.contains('resizebar-bottom')
      forPress({
        el,
        down: ({ clientY }, obj) => {
          obj.startY = clientY
          obj.startMaxHeight = parseInt(getComputedStyle($panel).height)
          if (!isBottom) {
            obj.startTop = parseInt(getComputedStyle($panel).top)
            obj.minHeight = parseInt(getComputedStyle($panel).minHeight)
            obj.maxHeight = window.innerHeight
          }
          return true
        },
        move: ({ clientY }, obj, first) => {
          if (first) {
            $panel.style.transition = 'none'
          }

          let diffValue = clientY - obj.startY
          if (isBottom) {
            $panel.style.height = `${obj.startMaxHeight + diffValue}px`
          } else {
            const height = Math.min(Math.max(obj.minHeight, obj.startMaxHeight - diffValue), obj.maxHeight)
            diffValue = obj.startMaxHeight - height

            $panel.style.height = `${height}px`
            $panel.style.top = `${Math.max(obj.startTop + diffValue, 0)}px`
          }
        },
        up: (e, obj, moved) => {
          if (!moved) return

          $panel.style.transition = ''
          cacheObj.panelMaxHeight = parseInt($panel.style.height)
          if (!isBottom) {
            cacheObj.panelPos = { ...cacheObj.panelPos, top: $panel.style.top }
          }

          Floater.#show(2)

        }
      })
    })
  }//绑定 panel的寬度的resize事件

  static #bindFullScreen(button) {//more.full
    const onFullscreenchange = () => {
      button.innerHTML = ''
      if (document.fullscreenElement) {
        button.appendChild(Floater.#svgs.unfull.cloneNode(true))
      } else {
        button.appendChild(Floater.#svgs.unfull.cloneNode(true))
        document.removeEventListener('fullscreenchange', onFullscreenchange, true)
      }
    }
    const fullscreen = (e) => {
      e.stopPropagation()
      document.removeEventListener('fullscreenchange', onFullscreenchange, true) //先移除，避免重複
      document.addEventListener('fullscreenchange', onFullscreenchange, true)

      fullScreenFn.toFullscreen()
    }

    button.addEventListener('click', fullscreen)
  }//绑定全屏事件

  static #bindPartialFullscreen(buttons, $panel, $ul) {//buttons=[buttons.partial,tools.partial]
    const partialFullscreen = (e) => {
      e.stopPropagation()

      Floater.#el.style.display = 'none'
      fullScreenFn.capturing(({ el }) => {
        Floater.#el.style.display = ''

      })
    }
    buttons.forEach(button => {
      button.addEventListener('click', partialFullscreen)
    })
  }//绑定选区全屏事件

  static #bindReadMode(button, $panel, $ul) {
    const attrName = 'floater-read-mode'
    // let readModeStyle
    // function initReadModel() {
    //   // 获取3个元素
    //   const centerX = innerWidth / 2 //document.documentElement.clientWidth / 2 //
    //   const $top = document.elementFromPoint(centerX, 20)
    //   const $content = document.elementFromPoint(centerX, 150)
    //   const $bottom = document.elementFromPoint(centerX, innerHeight - 20)
    //   const $left = document.elementFromPoint(20, innerHeight / 2)

    //   if (!$top || !$content || !$bottom || !$left) return

    //   const $content_top = findAncestor($top, $content) // 找a和b的最近共同祖先
    //   const $content_bottom = findAncestor($content, $bottom)
    //   const $content_left = findAncestor($content, $left)

    //   if (!$content_top || !$content_bottom || !$content_left) return

    //   const $top_bar = findAncestor2($content_top, $top)// 找ab的直接子元素d（a的上级）
    //   const $bottom_bar = findAncestor2($content_bottom, $bottom)
    //   const $left_bar = findAncestor2($content_left, $left)
    //   const $content_area1 = findAncestor2($content_bottom, $content)
    //   const $content_area2 = findAncestor2($content_left, $content)

    //   // if (!$top_bar || !$bottom_bar || !$left_bar) return
    //   if (!$bottom_bar || !$left_bar) return

    //   const hiddens = (() => {
    //     debugger
    //     let $area = $content_area1
    //     const relation = $content_area1.compareDocumentPosition($content_area2)
    //     if (relation & Node.DOCUMENT_POSITION_CONTAINED_BY) {
    //       $area = $content_area2 //console.log('el1包含el2');
    //     } else if (relation & Node.DOCUMENT_POSITION_CONTAINS) {
    //       $area = $content_area1 //相反
    //     }

    //     const n = parseInt(innerWidth / 100)
    //     const ary = new Array(n).fill(100).map((n, i) => (n * (i + 1)))
    //     ary[n] = innerWidth - 20
    //     const lists = ary.map(x => document.elementsFromPoint(x, 20))
    //     lists.forEach(list => {
    //       list.forEach(el => {
    //         while (el) {
    //           el = el.parentElement
    //           const index = list.indexOf(el)
    //           if (index !== -1) {
    //             list.splice(index, 1)
    //           }
    //         }
    //       })
    //     })
    //     let result = [...new Set(lists.flat())]
    //     console.log('result1', result)

    //     result = result.map(el => {
    //       const ancestor = findAncestor(el, $area)
    //       if (ancestor) {
    //         el = findAncestor2(ancestor, el)
    //         return el
    //       } else {
    //         return undefined
    //       }
    //     }).filter(t => t)
    //     console.log('result2', result)
    //     result = [...new Set(result)]
    //     return result
    //   })()

    //   if ($top_bar) hiddens.push($top_bar)// $top_bar.setAttribute(`${attrName}-top`, '')
    //   if ($bottom_bar) hiddens.push($bottom_bar)// $bottom_bar.setAttribute(`${attrName}-bottom`, '')
    //   if ($left_bar) hiddens.push($left_bar)// $left_bar.setAttribute(`${attrName}-left`, '')

    //   hiddens.forEach(el => { el.setAttribute(`${attrName}-item`, '') })
    //   // 注入阅读模式CSS
    //   readModeStyle = document.getElementById(`${attrName}-style`)
    //   if (!readModeStyle) {
    //     readModeStyle = document.createElement('style')
    //     readModeStyle.id = `${attrName}-style`
    //     readModeStyle.textContent = `
    //       html[${attrName}="true"] [${attrName}-item] {
    //         display: none !important;
    //       }`
    //     document.head.appendChild(readModeStyle)
    //   }

    //   document.documentElement.setAttribute(attrName, 'false')// 设置attr和默认值
    // }

    // const toggleReadModel = () => {// 启用阅读模式
    //   if (!Floater.#chatId) {
    //     document.documentElement.setAttribute(attrName, 'false')
    //     return
    //   }

    //   let inited = document.documentElement.hasAttribute(attrName)
    //   if (!inited || !document.querySelector(`[${attrName}-item]`)?.isConnected) {//@chatgpt 新会话会重新创建聊天输入框
    //     initReadModel()
    //     inited = document.documentElement.hasAttribute(attrName)
    //   }
    //   if (!inited) return

    //   const readed = document.documentElement.getAttribute(attrName) === 'false'
    //   document.documentElement.setAttribute(attrName, readed)
    // }

    button.onclick = () => {
      const readed = document.documentElement.hasAttribute(attrName)
      if (readed) {
        document.documentElement.removeAttribute(attrName)
        button.classList.add('inactive')
      } else if (Floater.#chatId && document.querySelector(`[${MainBase.attrs.articleParent}]`)) {
        document.documentElement.setAttribute(attrName, '')
        button.classList.remove('inactive')
      }
    }
  }//@理论可以，现实却复杂;要排除panel

  static #bindNavigationAction(button, $panel, navTree, cacheObj) {
    button.onclick = () => {
      navTree.navAction = !navTree.navAction
      cacheObj.navAction = navTree.navAction
      if (navTree.navAction) {
        button.classList.remove(Floater.#classNames.over)
      } else {
        button.classList.add(Floater.#classNames.over)
      }
    }
  }

  static #bindExport(button, main, $panel, $ul) {

    button.addEventListener('click', async () => {
      const chatId = Floater.#getChatId()
      if (!chatId) return

      const options = Array.from($ul.children).map((el, index) => ({ id: index, li: el, name: el.querySelector(':scope > div').textContent }))

      const { selected: selectedOptions, fileType, fileName } = await Floater.#openDownOptionsDialog(options, main.scrollY) //过滤掉未选择的聊天项
      if (!fileType || !selectedOptions || selectedOptions.length === 0) return

      let succeeded = false, saveFailed = false
      if (fileType === 'md') {
        let markdown = await main.generateMarkdown(selectedOptions, chatId)
        markdown = `Source: [${location.href}](${location.href})\n\n${markdown}`
        const blob = new Blob([markdown], { type: 'application/txt' })
        saveFailed = await Floater.#saveFileWithPicker(blob, `${fileName}.md`)

        succeeded = true
      } else if (fileType === 'pdf') {
        const base64 = await Floater.#printPdf(selectedOptions, fileName)
        if (base64) {
          const blob = await fetch(`data:application/pdf;base64,${base64}`).then(r => r.blob())
          saveFailed = await Floater.#saveFileWithPicker(blob, `${fileName}.pdf`)
        }
        succeeded = base64.length
      }
      saveFailed = !!saveFailed

    })
  }

  static async #printPdf(selectedOptions, fileName) {
    //问题：deepseek的回答有时包含h1,先不出处理；chatgpt/gemini好像没有这个问题。

    const names = Object.freeze({
      yes: 'we2d0-print-pdf-yes',//'print-pdf-yes',
      nav: 'we2d0-print-pdf-nav',//'print-pdf-nav',
      print: 'we2d0-print-pdf',//'print-pdf',
      showBtn: 'we2d0-show-btn'
    })

    const list = selectedOptions.map(({ li, name }) => {
      const ref = li.__ref?.deref()
      const reply = li.__reply
      ref.setAttribute(names.yes, '')
      reply?.setAttribute(names.yes, '')

      Array.from(ref.querySelectorAll('[role="heading"]')).forEach(el => {
        el.setAttribute('role', 'xxx')
      })

      const h1 = document.createElement('h1')
      h1.setAttribute(names.nav, '')
      h1.textContent = truncateByBytes(name, 32).replace(/\n/g, ' ') || '[non-text]'
      ref.firstElementChild.before(h1)
      return { h1, ref, reply }
    })
    document.documentElement.setAttribute(names.print, '')

    const imageButtons = Array.from(document.body.querySelectorAll('button>img,button>video')).map(t => t.parentElement)
    imageButtons.forEach(btn => btn.setAttribute(names.showBtn, ''))

    const closeAlert = alert2(0, lang('pdfGeneratingTitle'), lang('pdfGeneratingNotice')) //'PDF生成中...','切勿关闭页面顶部提示！'
    try {
      let { data, errorMsg } = await chrome.runtime.sendMessage({ type: 'export-pdf', data: { fileName } })
      if (errorMsg) {
        alert2(-1, lang('pdfGenerationFailed')) //'PDF生成失败'
        console.log('export-pdf', errorMsg)
        return ''
      } else {
        closeAlert()
        return data
      }
    } catch (error) {
      alert2(-1, lang('pdfGenerationFailed'))
      console.log('export-pdf', error)
      return ''
    } finally {
      list.forEach(({ h1, ref, reply }) => {
        Array.from(ref.querySelectorAll('[role="xxx"]')).forEach(el => {
          el.setAttribute('role', 'heading')
        })
        h1.remove()
        ref.removeAttribute(names.yes)
        reply?.removeAttribute(names.yes)
      })
      document.documentElement.removeAttribute(names.print, '')
      imageButtons.forEach(btn => btn.removeAttribute(names.showBtn))
    }
  }

  static async #openDownOptionsDialog(items, scrollY) {
    function dialogJs(modal, items) {
      return new Promise(async function (resolve, reject) {
        let selectedItems = new Array(items.length).fill(false) // 存储选中状态

        // 获取DOM元素
        const $itemList = modal.querySelector('#itemList')
        const $name = modal.querySelector('input.file-name')
        const selectAllCheckbox = modal.querySelector('#selectAllCheckbox')
        const successBtn = modal.querySelector('button.btn-success')
        const closeBtn = modal.querySelector('button.btn-secondary')
        const $itemTemp = $itemList.children[0]
        $itemTemp.remove()

        let { downFileType } = await chrome.storage.local.get('downFileType')
        downFileType = downFileType || 'pdf'
        modal.querySelector(`[name="file-type"][value="${downFileType}"]`).checked = true

        // 渲染项目列表
        function renderItems() {
          const scrollTo = (li) => {
            const el = li.__ref?.deref()
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              el.closest(`[${MainBase.attrs.scroller}]`).scrollBy(0, scrollY) //补偿滚动
            }
          }

          items.forEach((item, index) => {
            const name = truncateByBytes(item.name)
            const $item = $itemTemp.cloneNode(true)
            const $name = $item.querySelector('label>input[type="text"]')
            const $checkbox = $item.querySelector('.item-checkbox')
            $checkbox.dataset.index = index
            $checkbox.checked = selectedItems[index]
            $checkbox.onchange = () => {
              if (!$checkbox.checked) {
                $name.value = $name.title
              }
              updateItemSelection(index, $checkbox.checked)
              scrollTo(item.li)
            }

            {
              let tiemId //为了解决chatgpt不明原因 输入一个字符就失去焦点的问题            
              $name.value = name
              $name.title = item.name
              $name.onfocus = () => {
                clearTimeout(tiemId)
                // $name.select()
                scrollTo(item.li)
              }
              $name.onblur = () => {
                tiemId = setTimeout(() => {
                  $name.value = truncateByBytes($name.value.trim()) || name
                }, 300)
              }
            }//name的修改

            $itemList.appendChild($item)
          })

          // 更新全选按钮状态
          updateSelectAllStatus()
        }

        // 更新单个项目的选中状态
        function updateItemSelection(index, checked) {
          selectedItems[index] = checked
          updateSelectAllStatus()
        }

        // 更新全选按钮状态
        function updateSelectAllStatus() {
          const allChecked = selectedItems.every(item => item === true)
          const someChecked = selectedItems.some(item => item === true)

          selectAllCheckbox.checked = allChecked
          selectAllCheckbox.indeterminate = !allChecked && someChecked
        }

        // 全选/取消全选
        selectAllCheckbox.onchange = function toggleAll() {
          const isChecked = selectAllCheckbox.checked
          selectedItems = selectedItems.map(() => isChecked)

          // 更新所有复选框
          const checkboxes = modal.querySelectorAll('.item-checkbox')
          checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked
          })

          updateSelectAllStatus()
        }

        {
          let tiemId //为了解决chatgpt不明原因 输入一个字符就失去焦点的问题
          const name = truncateByBytes(document.title)
          $name.value = name
          // $name.title = $name.value
          $name.onblur = () => {
            tiemId = setTimeout(() => {
              $name.value = truncateByBytes($name.value.trim()) || name
              // $name.title = $name.value
            }, 300)
          }
          $name.onfocus = () => {
            clearTimeout(tiemId)
          }
        }//file name的修改

        // 关闭弹窗
        function closeModal() {
          modal.style.display = 'none'
          modal.remove()
        }

        closeBtn.onclick = () => {
          closeModal()
          resolve({})
        }
        // 确定选择
        successBtn.onclick = function confirmSelection() {
          const selected = items.filter((item, index) => selectedItems[index])
          selected.forEach(t => {
            const input = Array.from($itemList.children)[t.id].querySelector('input[type="text"]')
            t.name = input.value || input.title
          })
          console.log(selected)

          downFileType = Array.from(modal.querySelectorAll('[name="file-type"]')).find(t => t.checked).value
          chrome.storage.local.set({ downFileType })

          resolve({ selected, fileType: downFileType, fileName: $name.value.trim() })
          closeModal()
        }

        renderItems()

        selectAllCheckbox.checked = true
        selectAllCheckbox.onchange()
      })
    }

    const modal = await getPanelByPath('resources/optionDialog.html')
    translate(modal)
    Floater.#el.appendChild(modal)

    const result = await dialogJs(modal, items)

    return result
  }

  static #downloadBlob(blob, filename) {
    // 创建对象 URL
    const url = URL.createObjectURL(blob);

    // 创建 <a> 元素
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';

    // 触发点击事件
    document.body.appendChild(a);
    a.click();

    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
  static #htmlToMarkdown(html) {
    const turndownService = new TurndownService()
    return turndownService.turndown(html)
  }//注意：第三方turndown.js文件已删除，TurndownService会报错。

  static async #saveFileWithPicker(data, fileName, types = []) {
    try {
      if (!('showSaveFilePicker' in window)) {
        Floater.#downloadBlob(data, fileName)
        return
      }

      const options = {
        suggestedName: fileName,
        types
        // types: [
        //   {
        //     description: '',
        //     accept: {
        //       'application/octet-stream': ['.txt'],
        //     }
        //   }
        // ]
      }

      const handle = await window.showSaveFilePicker(options)
      const writable = await handle.createWritable()
      await writable.write(data)
      await writable.close()

      return
    } catch (error) { // 用戶取消了選擇
      if (error.name !== 'AbortError') {
        console.log('saving error:', error)
      }
      if (error.stack?.includes('SecurityError')) {
        Floater.#downloadBlob(data, fileName)
        return
      } else {
        return error
      }
    }
  }

  static async #bindShortcutKeys($keyPanel, { fold, plies, refresh, read, jmode, closeBtn }, { $panel, $ul, cacheObj }, scrollPrompt, scrollHeadline) {

    const fns = Object.freeze({
      panel: () => {
        if (Floater.#isShow) {
          closeBtn.click()
        } else {
          Floater.#openPanel($panel, $ul, cacheObj)
        }
      },
      fold: () => {
        fold.click()
      },
      plies: () => {
        plies.click()
      },
      refresh: () => {
        refresh.click()
      },
      read: () => {
        read.click()
      },
      jmode: () => {
        jmode.click()
      },
      wheel: () => { },
      promptDown: () => {
        scrollPrompt('down')
      },
      promptUp: () => {
        scrollPrompt('up')
      },
      firstPrompt: () => {
        scrollPrompt('home')
      },
      lastPrompt: () => {
        scrollPrompt('end')
      },
      headlineDown: () => {
        scrollHeadline('down')
      },
      headlineUp: () => {
        scrollHeadline('up')
      }
    })

    const cacheKey = this.#consts.shortcutkeyCacheKey
    const cacheKeys = await chrome.storage.local.get([cacheKey]).then(({ [cacheKey]: obj }) => (obj || {}))
    {
      $keyPanel.addEventListener('focus', e => { e.target.select && e.target.select() }, true)
      $keyPanel.addEventListener('change', e => {
        const el = e.target

        if (el.type === 'checkbox') {
          const actionNames = el.getAttribute('action-name').split(',')
          actionNames.forEach(actionName => {
            const [oldKey, setObj] = Object.entries(cacheKeys).find(([key, { name }]) => (name === actionName))
            setObj.checked = el.checked
          })
        } else if (el.type === 'text') {
          const actionName = el.getAttribute('action-name')
          const [oldKey, { checked }] = Object.entries(cacheKeys).find(([key, { name }]) => (name === actionName))
          const value = el.value.trim().toUpperCase()
          let newKey

          if (!value || !(/[0-9a-zA-Z]/).test(value)) {
            newKey = oldKey
          } else {
            if (cacheKeys[value]) {//键 已被使用
              newKey = oldKey
            } else {
              newKey = value
            }
          }

          delete cacheKeys[oldKey]
          cacheKeys[newKey] = { name: actionName, checked }
          el.value = newKey
        }

        chrome.storage.local.set({ [cacheKey]: cacheKeys })
      }, true)
    }//用户修改快捷键

    const onKeydwon = (e) => {
      if (e.ctrlKey || e.shiftKey) return //避免影响其它系统快捷键，比如：search（Ctrl+F）
      if (!e.altKey) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName.toUpperCase())) return
        if (document.activeElement.isContentEditable) return
      }

      let { key } = e
      console.log(key, document.activeElement.tagName)
      key = key.toUpperCase()
      const item = cacheKeys[key]
      if (!item) return

      const { name, checked } = item
      const fn = fns[name]
      if (fn && checked) {
        e.preventDefault()
        e.stopPropagation()

        fn()
      }
      // else if (['AltLeft', 'AltRight'].includes(code)) {
      //   onKeyup()
      //   window.addEventListener('wheel', onWheel, { passive: false })
      //   document.addEventListener('keyup', onKeyup, true)
      // }@注意：Alt按键的判断不好用：第一次按下Alt时焦点会移出页面（到了浏览器右上角的"…"），第二次就监听不到Alt按键（除非点击页面使焦点回到页面）
    }

    document.addEventListener('keydown', onKeydwon, true)

    {
      const onWheel = (e) => {
        if (!e.altKey) return

        e.preventDefault()

        if (e.deltaY > 0) {
          fns.promptDown()
        } else if (e.deltaY < 0) {
          fns.promptUp()
        }
      }

      const el = $keyPanel.querySelector('[name="wheel"]')
      if (el) {//万一我把它的HTML注释了
        el.onchange = () => {
          window.removeEventListener('wheel', onWheel, { passive: false })
          if (el.checked) {
            window.addEventListener('wheel', onWheel, { passive: false })
          }
        }
        el.onchange()//init
      }
      // const onKeyup = () => {
      //   window.removeEventListener('wheel', onWheel, { passive: false })
      //   document.removeEventListener('keyup', onKeyup, true)
      //   console.log('onKeyup')
      //   // document.body.focus()没用，焦点没回到页面
      // }@这段注释代码 用作提醒
    }//滚轮的快捷滚动
  }

  /**
   * 几种方法：1.IntersectionObserver。2.锚点定位+elementFromPoint。3.每个h的offsetTop。4.中心点elementFromPoint
   * 无论是IntersectionObserver/requestAnimationFrame/scroll事件，都卡，完全没方法。
   */
  static #viewPortObserver(navTree, button, scrollY, cacheObj) {
    const classNames = Object.freeze({
      entered: 'entered',
      enteredSuperior: 'entered-superior'
    })

    const nearestScroll = (el) => {
      if (!el) return

      const lastScrollTop = navTree.el.scrollTop
      el.scrollIntoView({ behavior: 'instant', block: 'nearest' })
      const curScrollTop = navTree.el.scrollTop
      if (lastScrollTop > curScrollTop) {
        navTree.el.scrollBy(0, -31) //补偿滚动（解决：li定位到最顶被 sticky的根Li遮住时；不完美，如果li刚好……）
      }
    }

    let scroller, contentWalker
    const { getCurrentViewPortElement: f, locate: g } = (() => {
      let offsetTops
      {
        const observer = new MutationObserver(() => { offsetTops = undefined })
        observer.observe(navTree.el, { childList: true, subtree: true })
      }//监听navTree.el的DOM变化，随时清除offsetTops，使offsetTops保持最新

      const getCurrentViewPortElement = () => {
        const scrollTop = scroller.scrollTop
        if (!offsetTops) {
          const els = Array.from(navTree.el.querySelectorAll('li')).map(li => ({ li, el: li.__ref?.deref() })).filter(t => t.el)
          if (!els.length) return {}
          if (els.find(t => !t.el.offsetParent)) return {}//lidui对应的EL未加载完成
          offsetTops = els.map(({ li, el }) => {
            const { top } = el.getBoundingClientRect()
            return {
              li,
              el,
              offsetTop: top + scrollTop,
            }
          })
          console.log('offsetTops', offsetTops.length)
        }

        let viewObj
        const scrollOffset = scrollTop + 100
        for (let i = 0; i < offsetTops.length; i++) {
          const obj = offsetTops[i]
          if (scrollOffset >= obj.offsetTop) {
            viewObj = obj
          } else {
            break // 已经超过当前视口，停止搜索
          }
        }//搜索视口元素

        let li = viewObj?.li
        while (li && !li.offsetParent) {
          li = li.parentElement.parentElement
        }//找到显示的li（没折叠隐藏）

        return { viewObj, li }
      }

      let lastViewObj
      const locate = (scrolling = undefined) => {
        const { viewObj, li } = getCurrentViewPortElement()
        if (!viewObj) {
          lastViewObj?.li?.classList.remove(classNames.entered)
          lastViewObj = undefined
          return
        }

        if (viewObj && viewObj !== lastViewObj) {
          lastViewObj?.li?.classList.remove(classNames.entered)
          viewObj.li.classList.add(classNames.entered)
          lastViewObj = viewObj

          if (li) {
            if (scrolling) {
              scrolling(li)
            } else {
              nearestScroll(li)
            }
          }
        }
      }

      return { getCurrentViewPortElement, locate }
    })()//用伪"offsetTop"定位；性能不高，准确度高。

    const { getCurrentViewPortElement, locate } = (() => {
      const isGemini = location.hostname.includes('gemini')

      const getCurrentViewPortElement_x = () => {
        const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2)
        const $reply = el.closest('[processed="reply"]')
        let $user
        if (isGemini) {
          $user = el.closest('[processed="user"]')
        } else {
          $user = $reply
          while ($user) {
            $user = $user.previousElementSibling
            const type = $user?.getAttribute('processed')
            if (type) {
              if (type !== 'user') {
                $user = undefined
              }
              break
            }
          }
        }
        const li = $user?.__tree_li_ref?.deref()
        return li
      }

      // let skewTop
      /**
       * 注意：因为是用elementFromPoint获取的el，所以el可能是任意的，不一定就是scroller内的元素
       */
      const getCurrentViewPortElement = () => {
        const topmost = 90
        let el = document.elementFromPoint(innerWidth / 2, topmost)
        let li = el.__tree_li_ref?.deref()
        if (!li && el.matches(`[${TreeCreatorBase.attrs.markdown}]`)) {
          const childs = Array.from(el.children).map(child => {
            const { top } = child.getBoundingClientRect()
            return { child, top }
          })
          let index = childs.findIndex(t => t.top > topmost) - 1
          index = index >= 0 ? index : 0
          el = childs[index].child
          li = el.__tree_li_ref?.deref()
          // if (!skewTop) {
          //   skewTop = parseInt(topmost + (parseInt(getComputedStyle(el).lineHeight) || 24))
          // }
          // el = document.elementFromPoint(innerWidth / 2, skewTop)//24：最好是line-height的值
        }//处理"误差"：多耗点性能，找准确点。

        if (li) {
          return { li, el }
        } else if (contentWalker) {
          contentWalker.currentNode = el
          el = contentWalker.previousNode()
          return { li: el?.__tree_li_ref.deref(), el }
        } else {
          return {}
        }
      }

      const locate = (() => {
        let lastLi
        const changeEnteredLi = (li) => {
          if (li === lastLi) return false

          while (lastLi) {
            lastLi.classList.remove(classNames.entered, classNames.enteredSuperior)
            if (lastLi.parentElement === navTree.el) break
            lastLi = lastLi.parentElement?.parentElement
          }
          if (li) {
            li.classList.add(classNames.entered)
            let supLi = li
            while (supLi && supLi.parentElement !== navTree.el) {
              supLi = supLi.parentElement?.parentElement
              supLi?.classList.add(classNames.enteredSuperior)
            }
          }
          lastLi = li
          return true
        }

        return (scrolling = undefined) => {
          let { li } = getCurrentViewPortElement()
          if (!li) return

          const changed = changeEnteredLi(li)

          if (changed) {
            while (li && !li.offsetParent) {
              li = li.parentElement?.parentElement
            }//找可见的li
            (li && scrolling) ? scrolling(li) : nearestScroll(li)
          }
          // console.log(li?.className, Date.now())
        }
      })()

      return { getCurrentViewPortElement, locate }
    })()//用elementFromPoint定位，性能比offsetTop高，准确度粗。

    button.onclick = () => {
      locate(li => {
        li?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }

    const scrollHandle = (() => {
      const fn = () => {
        locate(li => {
          li && nearestScroll(li.querySelector(':scope>div'))
        })
      }

      let timeId
      return (e) => {
        clearTimeout(timeId)
        timeId = setTimeout(fn, 150)//比下面的setTimeout性能好，没必要"紧密"跟随滚动
        // timeId = timeId || setTimeout(() => {
        //   timeId = undefined
        //   fn()
        // }, 200)
      }
    })()

    let onShow, onHide
    return [
      (_scroller) => {
        Floater.#offShow(onShow)
        Floater.#offHide(onHide)
        contentWalker = undefined

        if (!_scroller) return

        scroller = _scroller
        contentWalker = document.createTreeWalker(
          scroller,
          NodeFilter.SHOW_ELEMENT,
          (node) => node.__tree_li_ref?.deref() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP //@不完善：gemini加载结束后经常删除元素（监测不到），重新生成的同内容的el就没有__tree_li_ref
          // (node) => {
          //   if(node.__tree_li_ref?.deref()){
          //     return NodeFilter.FILTER_ACCEPT
          //   }else if(node.constructor === HTMLHeadingElement){
          //     return node.closest(`[${MainBase.attrs.articleParent}]`) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
          //   }
          // }
        )

        Floater.#onShow(onShow = () => {
          button.onclick()

          _scroller.addEventListener('scroll', scrollHandle, { passive: true })
        })
        Floater.#onHide(onHide = () => {
          _scroller.removeEventListener('scroll', scrollHandle, { passive: true })
        })
      },
      (dir) => {
        let li
        if (dir === 'home') {
          li = navTree.el.firstElementChild
        } else if (dir === 'end') {
          li = navTree.el.lastElementChild
        } else {
          li = getCurrentViewPortElement().li

          while (li && li.parentElement !== navTree.el) {
            li = li.parentElement?.parentElement
          }// li = li.closest('ul.tree>li')

          if (!li) return

          li = (dir === 'up' ? li.previousElementSibling : li.nextElementSibling) || li
        }
        if (!li) return

        const el = li?.__ref?.deref()
        if (!el?.isConnected) {
          Floater.TreeCreator.regainCreateRootLi(li, cacheObj.isDeep)
        }
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'start' })
          if (li.previousElementSibling) {//第一个
            scroller.scrollBy(0, scrollY) //补偿滚动
          }
        }
      },//scroll prompt
      (() => {
        const treeWalker = document.createTreeWalker(
          navTree.el,
          NodeFilter.SHOW_ELEMENT,
          (node) =>
            !node.matches('li')
              ? NodeFilter.FILTER_SKIP //FILTER_REJECT
              : (node.matches('.leaf[f-n-t="common"]') || node.parentElement === navTree.el)
                ? NodeFilter.FILTER_ACCEPT
                // : node.querySelector(':scope>ul>li.leaf[f-n-t="deep"]')
                : node.children[1]?.children[0]?.matches('.leaf[f-n-t="deep"]')
                  ? NodeFilter.FILTER_ACCEPT
                  : NodeFilter.FILTER_SKIP,
        )//@注：（TreeWalker的特点）当navTree.el的children改变后，treeWalker.currentNode不能用已被移除的el

        return (dir) => {
          let { li } = getCurrentViewPortElement()
          if (!li) return

          if (li.matches('.leaf[f-n-t="deep"]')) {
            li = li.parentElement.parentElement
          }

          treeWalker.currentNode = li

          li = dir === 'up' ? treeWalker.previousNode() : treeWalker.nextNode()
          if (!li) return

          const el = li.__ref?.deref()
          if (!el?.isConnected) {
            let rootLi = li
            while (rootLi) {
              if (rootLi.parentElement === navTree.el) break
              rootLi = rootLi.parentElement
            }
            Floater.TreeCreator.regainCreateRootLi(rootLi, cacheObj.isDeep)
          }
          if (el) {
            el.scrollIntoView({ behavior: 'instant', block: 'start' })
            if (li.parentElement === navTree.el && li.previousElementSibling) {
              scroller.scrollBy(0, scrollY) //补偿滚动
            }
          }
        }
      })()//scroll headline
    ]
  }
}
class NavTree {
  static #classNames = Object.freeze({
    refreshingClass: 'refreshing',
    starClass: 'star',
    superStarClass: 'super-star'
  })
  static #getDivChildIndex = (el) => (['STAR-SVG', 'FULL-SCREEN', 'TITLE-NAME', 'I'].indexOf(el.tagName.toUpperCase()))
  #processedMark
  #updateTreeByMutation
  #regainCreateRootLi
  #onCollectStar
  #stars = []
  #isDeep = false
  #navAction = true // click=true;hover=false
  set navAction(value) { this.#navAction = !!value }
  get navAction() { return this.#navAction }
  #ul
  #titlebox
  get el() {
    return this.#ul
  }
  #onRootLiToggle = () => { }
  constructor({ $ul, navAction, isDeep, onRootLiToggle, processedMark, updateTreeByMutation, regainCreateRootLi, onChangeSubOutlineWidth, onCollectStar, scrollY, $titlebox }) {
    this.#ul = $ul //document.createElement('ul')
    this.#navAction = navAction
    this.#isDeep = isDeep
    this.#onRootLiToggle = onRootLiToggle
    this.#onCollectStar = onCollectStar || (() => false)
    this.#updateTreeByMutation = updateTreeByMutation
    this.#regainCreateRootLi = regainCreateRootLi
    this.#processedMark = processedMark
    this.#titlebox = $titlebox

    const getByLiChildren = (target) => {
      // const { li, rootLi, $ref, indexs }
      let li = target.closest('li')
      const { rootLi, indexs } = this.#getRootLi(li)
      const $ref = li.__ref?.deref()

      if (!rootLi.__reply?.isConnected || !$ref?.isConnected) {
        this.#regainCreateRootLi(rootLi, this.isDeep)

        li = this.#getDescendantLi(indexs)
        return { li, rootLi, $ref: li?.__ref?.deref(), indexs }
      }//如果缺失answer则尝试补全，@gemini的问题
      else {
        return { li, rootLi, $ref, indexs }
      }
    }

    const { clearHover, setHover, clearHoverForSelf } = NavTree.#bindLiDelayHover()

    this.#ul.addEventListener('contextmenu', e => {
      if (NavTree.#getDivChildIndex(e.target) === 0) {
        this.collectStar(e.target.parentElement.parentElement)
        e.preventDefault()
      }
    })//right-click a star icon to toggle the bookmark

    this.#ul.addEventListener('click', e => {
      const tagCode = NavTree.#getDivChildIndex(e.target)
      if (tagCode === -1) return

      e.stopPropagation()

      if (tagCode === 0) {
        this.collectStar(e.target.parentElement.parentElement)
        return
      }
      else if (tagCode === 1) {
        const reply = e.target.parentElement.parentElement.__reply
        reply && fullScreenFn.toFullscreen(reply)
      }
      else if (tagCode === 2) {
        e.target.classList.remove('show-title')
      }//单击后隐藏 titlebox

      const { li, rootLi, $ref, indexs } = getByLiChildren(e.target)

      if (!li) return

      const isRootLi = li === rootLi

      clearHoverForSelf(li)//单击后隐藏 subtree，以免遮挡内容

      if (tagCode !== 3 && this.navAction) {//jump
        if (!isRootLi) {
          this.#dispatchRootLiFoldEvent(rootLi, true)
        }//先保證消息是展開的
        if ($ref) {
          $ref.scrollIntoView({ behavior: 'instant', block: 'start' }) //跳到消息处；answer=空 就是意外！
        }
      } else if (tagCode === 3) {//fold

        // if (TreeCreatorBase.power < 0 && (indexs[indexs.length - 1] < this.#ul.children.length - 5)) {
        //   onUnpower()
        //   return
        // }//权限

        const isLeaf = NavTree.#isLeaf(li)
        let opened = NavTree.#getFoldStatus(li)

        if (isRootLi || !isLeaf) {
          NavTree.#foldItem(li, opened, e.ctrlKey)
        }

        if (isRootLi) {
          this.#dispatchRootLiFoldEvent(li)
        }

      }
    })//單擊目錄的item時，滾動到視口區域+同步摺叠/展開

    const fn1 = () => {
      // const { mouseleave, mouseover } = this.#getTitleboxBinder()
      // const { clearHover, setHover } = NavTree.#bindLiDelayHover()

      // this.#ul.addEventListener('mouseleave', (e) => {
      //   // mouseleave(e)
      // })//mouseleave：只是离开this.#ul，不是它的子孙元素

      let timeId
      this.#ul.addEventListener('mouseover', (e) => {
        e.stopPropagation()
        // mouseover(e)
        setHover(this.#ul, e.target)

        const { target, offsetX } = e
        if (NavTree.#getDivChildIndex(target) === 2) {
          if (this.navAction) {//title-name
            target.classList.remove('show-title')
            if (target.scrollWidth > target.clientWidth) {//内容溢出时
              setTimeout(() => {
                target.classList.add('show-title')
                target.style.setProperty('--offset-x', `${offsetX}px`)
              }, 100)//延迟：减少闪烁（鼠标悬停并滚动时）
            }
          } else {
            clearTimeout(timeId)
            timeId = setTimeout(() => {
              const { $ref } = getByLiChildren(e.target)
              if ($ref) {
                $ref.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }, 100)
          }
        }
      })//mouseover进入this.#ul和他的子孙元素都触发

      this.#ul.addEventListener('mouseout', e => {
        e.stopPropagation()
        clearHover(this.#ul, e.target)
      })
    }//mouseleave和mouseover/mouseout事件绑定titlebox/star/delay-hover
    fn1()

    const fn2 = () => {
      return
      this.#ul.addEventListener('mousemove', (e) => {
        if (e.buttons !== 0) return
        const ul = e.target
        if (ul.tagName === 'UL' && ul !== this.#ul) {
          // console.log('e.offsetX', e.offsetX)
          if (e.offsetX < 10) {
            ul.classList.add('resize')
          } else {
            ul.classList.remove('resize')
          }
        }
      })//@注意：e.offsetX要配合ul.style.padding-left使用

      {
        const el = this.#ul
        forPress({
          el,
          down(e, obj) {
            if (e.target.tagName !== 'UL' || !e.target.classList.contains('resize')) return

            obj.startClientX = e.clientX
            obj.startWidth = parseInt(getComputedStyle(e.target).width)
            return true
          },
          move(e, obj, first) {
            obj.width = obj.startWidth - (e.clientX - obj.startClientX)
            el.style.setProperty('--sub-outline-width', `${obj.width}px`)
            console.log('obj.width', `${obj.width}px , ${obj.startWidth} - (${e.clientX} - ${obj.startClientX})`)
          },
          up(e, obj, moved) {
            if (!moved) return

            onChangeSubOutlineWidth({ value: `${obj.width}px` })
          }
        })
      }//通过拖拉 调整 sub-outline width
    }//改变sub-outline width
    fn2()
  }

  static #bindLiDelayHover() {
    const time = 200
    const getLis = (ul, el) => {
      const list = []
      while (el !== ul) {
        if (el.constructor === HTMLLIElement) list.push(el)
        el = el.parentElement
      }
      return list
    }

    const clearHover = (li) => {
      clearTimeout(li.__overTimeId)
      delete li.__overTimeId
      li.__outTimeId = li.__outTimeId || setTimeout(() => {
        li.removeAttribute('delay-hover')
        delete li.__outTimeId
      }, time)
    }

    const setHover = (li) => {
      clearTimeout(li.__outTimeId)
      delete li.__outTimeId
      li.__overTimeId = li.__overTimeId || setTimeout(() => {
        li.setAttribute('delay-hover', '')
        delete li.__overTimeId
      }, time)
    }

    const clearHoverForSelf = (li) => {
      clearTimeout(li.__overTimeId)
      clearTimeout(li.__outTimeId)
      li.removeAttribute('delay-hover')
    }

    return {
      clearHover: (ul, el) => {
        const list = getLis(ul, el)
        list.forEach(li => clearHover(li))
      },
      setHover: (ul, el) => {
        const list = getLis(ul, el)
        list.forEach(li => setHover(li))
      },
      clearHoverForSelf
    }
  }//li的延迟hover

  #getTitleboxBinder() {
    let lastAnchor, showId, hideId
    const hideTitlebox = () => {
      clearTimeout(showId)
      hideId = setTimeout(() => {
        this.#titlebox.removeAttribute('style')
        if (lastAnchor) {
          lastAnchor.style.anchorName = ''
          lastAnchor = undefined
        }
      }, 100)//延迟消失 是为了使显示“连贯”，不闪烁
    }
    const showTitlebox = (e) => {
      clearTimeout(hideId)
      showId = setTimeout(() => {
        lastAnchor && (lastAnchor.style.anchorName = '')
        lastAnchor = e.target
        lastAnchor.style.anchorName = '--titlebox-anchor'

        this.#titlebox.style.setProperty('--offset-x', `${e.offsetX}px`)
        this.#titlebox.textContent = e.target.getAttribute('title2')
      }, 100)//延迟显示 用于“节流”
    }
    return {
      mouseleave: () => {
        hideTitlebox()
      },
      mouseover: (e) => {
        hideTitlebox()
        if (NavTree.#getDivChildIndex(e.target) === 2) {
          showTitlebox(e)
        }

        // if (div.scrollWidth === div.clientWidth) {
        //   hideTitlebox()
        //   return
        // } //内容未溢出
      }
    }
  }//顯示模仿的title；@注：这个函数gemini使用的很好，但chatgpt却很卡，不知道为什么？？？

  get isDeep() {
    return this.#isDeep
  }

  /**
   * 如果children是空的，会返回true(关闭)
   */
  get folded() {
    return Array.from(this.#ul.children).every(li => NavTree.#getFoldStatus(li))
  }//是否全部折叠

  static #getFoldStatus(li) {
    return li.classList.contains(globalClassNames.collapsed)
  }//单个折叠状态

  static #isLeaf(li) {
    return li.classList.contains('leaf')
  }

  isRootLi(li) {
    return li.parentElement === this.#ul
  }

  #getRootLi(descendantLi) {
    const indexs = []
    while (descendantLi) {
      if (descendantLi.constructor === HTMLLIElement) {
        const index = Array.from(descendantLi.parentElement.children).indexOf(descendantLi)
        indexs.push(index)
      }
      if (descendantLi.parentElement === this.#ul) break
      descendantLi = descendantLi.parentElement
    }
    return { rootLi: descendantLi, indexs }
  }
  #getDescendantLi(indexs) {
    indexs = [...indexs]
    let ul = this.#ul
    let descendantLi
    while (ul) {
      const index = indexs.pop()
      descendantLi = ul.children[index]
      ul = descendantLi?.querySelector(':scope>ul')
    }
    return descendantLi
  }

  static #getTitle(li) {
    return li.querySelector(':scope>div>title-name')?.getAttribute('title2') || ''
  }

  #getPath(li) {
    const titles = []
    let el = li
    while (el && el !== this.#ul) {
      if (el.constructor === HTMLLIElement) titles.unshift(NavTree.#getTitle(el))
      el = el.parentElement
    }
    return titles.join('\n')
  }

  #matchStar(li, star) {
    return NavTree.#getTitle(li) === star.title && this.#getPath(li) === star.path
  }

  set stars(value) {
    this.#stars = value && value.constructor === Array ? value : []
  }

  get stars() {
    return this.#stars
  }

  async collectStar(li) {
    if (!li) return

    const starred = li.classList.contains(NavTree.#classNames.starClass)
    const item = starred ? li.__star : {
      indexs: this.#getRootLi(li).indexs,
      title: NavTree.#getTitle(li),
      path: this.#getPath(li)
    }
    if (!item) return

    const result = await this.#onCollectStar({ opt: starred ? 'remove' : 'add', item })
    if (!result) return

    if (starred) {
      this.#stars = this.#stars.filter(star => star.id !== item.id)
    } else {
      this.#stars.push(result)
    }
    this.updateStars()
  }

  updateStars() {
    const allLi = Array.from(this.#ul.querySelectorAll('li'))
    this.#ul.querySelectorAll('li, ul').forEach(el => {
      el.classList.remove(NavTree.#classNames.starClass, NavTree.#classNames.superStarClass)
      if (el.constructor === HTMLLIElement) delete el.__star
    })

    const used = new Set()
    this.#stars.forEach(star => {
      let li = Array.isArray(star.indexs) ? this.#getDescendantLi(star.indexs) : undefined
      if (!li || used.has(li) || !this.#matchStar(li, star)) {
        li = allLi.find(li => !used.has(li) && this.#matchStar(li, star))
      }
      if (!li) return

      used.add(li)
      li.classList.add(NavTree.#classNames.starClass)
      li.__star = star
      this.#updateSuperClassForStar(li)
    })
  }

  #updateSuperClassForStar(li) {
    let el = li.parentElement
    while (el && el !== this.#ul) {
      el.classList.add(NavTree.#classNames.superStarClass)
      el = el.parentElement
    }
  }//marks ancestors so "only bookmarks" keeps the branch visible

  showOnlyStars(yes) {
    this.#ul.classList.toggle('only-stars', !!yes)
  }

  getChildrenInfo() {
    return Array.from(this.#ul.children).map(li => {
      return {
        // $ask: li.__ref.deref(),
        answer: li.__reply,
        folded: NavTree.#getFoldStatus(li)
      }
    })
  }

  refresh(isSwitchDepth = false, articleParent = undefined) {
    articleParent = articleParent || this.#ul.children[0]?.__ref.deref()?.parentElement
    if (!articleParent) return false

    const articles = Array.from(articleParent.children)
    if (articles.find(el => el.__replying)) {
      alert2(0, lang('refreshAlert'))
      return false
    }

    const scrollRatio = this.#ul.scrollTop / this.#ul.scrollHeight

    const fn = async () => {
      await this.#updateTreeByMutation(this.#ul, this.isDeep, { type: 'load', articleParent })
      // this.#ul.scrollTop = scrollTop
      this.#ul.scrollTop = parseInt(this.#ul.scrollHeight * scrollRatio) //根據比列來重新定位scrollTop位置，這樣切換deep時，位置才準確
    }
    if (!isSwitchDepth) {
      this.#ul.classList.add(NavTree.#classNames.refreshingClass)
      setTimeout(() => {
        this.#ul.classList.remove(NavTree.#classNames.refreshingClass)
      }, 200)
    }
    fn()

    return true
  }

  foldSecondLayer(fold = true) {
    this.#ul.querySelectorAll(':scope > li > ul > li:not(.leaf)').forEach(li => {
      NavTree.#foldItem(li, !fold)
    })
  }

  togglePlies(shallow = true) {
    this.#ul.querySelectorAll('li:not(.leaf)').forEach(li => NavTree.#foldItem(li, true))

    if (shallow) {
      this.#ul.querySelectorAll(':scope > li > ul > li:not(.leaf)').forEach(li => {
        NavTree.#foldItem(li, false)
      })
    }
  }

  toggleDeep(articleParent = undefined) {
    this.#isDeep = !this.#isDeep

    const result = this.refresh(true, articleParent)

    if (!result) {
      this.#isDeep = !this.#isDeep
    }

    return result
  }

  toggleFold(isRecursion = false) {
    const opened = this.folded
    this.fold(opened, isRecursion)
  }

  openRootLiByAnswer(answer) {
    const li = Array.from(this.#ul.children).find(li => li.__reply === answer)
    NavTree.#foldItem(li, true)
  }

  fold(opened, isRecursion = false) {
    if (isRecursion) {
      this.#ul.querySelectorAll('li:not(.leaf)').forEach(li => {
        NavTree.#foldItem(li, opened)
      })
    } else {
      Array.from(this.#ul.children).forEach(li => {
        NavTree.#foldItem(li, opened)
      })
    }

    // this.#ul.querySelectorAll(':scope > li,li:not(.leaf)').forEach(li => {
    //   NavTree.#foldItem(li, opened)
    // })
  }

  static #foldItem(li, opened, isRecursion = false) {
    if (isRecursion) {
      const list = [li, ...Array.from(li.querySelectorAll('li'))]
      list.forEach(li => {
        if (opened) {
          li.classList.remove(globalClassNames.collapsed)
        } else {
          li.classList.add(globalClassNames.collapsed)
        }
      })
    } else {
      if (opened) {
        li.classList.remove(globalClassNames.collapsed)
      } else {
        li.classList.add(globalClassNames.collapsed)
      }
    }
  }

  static #recursiveFold(li) {
    if (NavTree.#isLeaf(li)) return false

    const opened = NavTree.#getFoldStatus(li)
    const branchs = Array.from(li.querySelectorAll('li:not(.leaf)'))
    branchs.push(li)
    branchs.forEach(li => {
      NavTree.#foldItem(li, opened)
    })

    return true
  }

  scrollIntoView(li) {
    if (li.parentElement !== this.#ul) {
      const rootLi = li.closest('ul.tree > li')
      NavTree.#foldItem(rootLi, true, true)
      this.#dispatchRootLiFoldEvent(rootLi, true)
    }
    li.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }//滚动li到视口中间

  #dispatchRootLiFoldEvent(rootLi, forceOpen = undefined) {
    const answer = rootLi.__reply
    const obj = forceOpen ? { answer, forceOpen } : { answer, opened: !NavTree.#getFoldStatus(rootLi) }
    this.#onRootLiToggle(obj)
  }//单个li的 折叠/展开 是由内部触发的，所以要发射一个事件('fold-item')通知外部；而全部 折叠/展开 是由外部触发的，不需要发射事件

  // slide(yes) {
  //   Array.from(this.#ul.children).forEach(li => {
  //     const ref = li.__ref.deref()
  //     if (yes) {
  //       // li.style.positionAnchor = li.getAttribute('sign')
  //       ref.style.anchorName = ref.getAttribute('slide-sign')
  //       li.style.setProperty('--top',`anchor(${li.getAttribute('sign')} top)`)
  //     } else {
  //       // li.style.positionAnchor = ''
  //       ref.anchorName = ''
  //       li.style.removeProperty('--top')
  //     }
  //   })
  // }
  // #dispatchEvent(eventName, detail) {
  //   const customEvent = new CustomEvent(eventName, {
  //     detail,
  //     bubbles: true,    // 事件是否冒泡
  //     cancelable: true  // 事件能否被取消
  //   })
  //   this.#ul.dispatchEvent(customEvent)
  // }
}
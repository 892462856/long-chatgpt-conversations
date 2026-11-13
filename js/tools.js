
//#region 
const lang = (msgKey) => (chrome.i18n.getMessage(msgKey))

const translate = (box) => {
  {
    box.querySelectorAll('[data-i18n]').forEach(el => {
      const msgKey = el.getAttribute('data-i18n')
      el.textContent = lang(msgKey)
    })
    box.querySelectorAll('[html-i18n]').forEach(el => {
      const msgKey = el.getAttribute('html-i18n')
      el.innerHTML = lang(msgKey)
    })
    box.querySelectorAll('[attr-i18n]').forEach(el => {
      const [attrKey, msgKey] = el.getAttribute('attr-i18n').split('=')
      el.setAttribute(attrKey, lang(msgKey))
    })
    box.querySelectorAll('[attrs-i18n]').forEach(el => {
      const list = el.getAttribute('attrs-i18n').split(';').map(t => t.split('='))
      list.forEach(([attrKey, msgKey]) => {
        el.setAttribute(attrKey, lang(msgKey))
      })
    })
  }// 翻译标记了data-i18n的元素
}

const Alert2 = (getParnet) => {
  const htmlUrl = chrome.runtime.getURL('resources/alert.html')
  let popup, button
  const close = () => {
    popup.style.display = 'none'
    popup.removeAttribute('keep')
    button.classList.remove('show')
  }
  fetch(htmlUrl).then(data => data.text()).then(html => {
    popup = document.createElement('div')
    popup.innerHTML = html
    popup = popup.firstElementChild
    button = popup.querySelector('button.to')

    popup.querySelector('.alert-close').onclick = close
  }).catch(error => {
    error.message = `${error.message}|${htmlUrl}`
    throw error
  })

  return (type, title, message = '', keep = false, { buttonText, callback, closable = true, useIcon = true } = {}) => {
    if (popup.hasAttribute('keep')) return

    popup.classList.remove('success', 'error')
    popup.classList.add(type === 1 ? 'success' : 'error')

    popup.querySelector('.alert-title').textContent = title
    popup.querySelector('.alert-message').textContent = message
    popup.style.display = 'block'
    keep && popup.setAttribute('keep', '')
    popup.setAttribute('closable', !!closable)
    popup.setAttribute('icon', !!useIcon)

    if (buttonText) {
      button.textContent = buttonText
      button.classList.add('show')
      button.onclick = callback
    } else {
      button.classList.remove('show')
      delete button.onclick
    }

    if (!popup.isConnected) {
      getParnet()?.appendChild(popup)
    }

    return close
  }
}

const getChatIdByLocation = () => document.location.pathname.match(/[a-z0-9-]{15,40}$/)?.[0]

const getPanelByPath = (path) => {
  return fetch(chrome.runtime.getURL(path)).then(data => data.text()).then(html => {
    popup = document.createElement('div')
    popup.innerHTML = html
    popup = popup.firstElementChild

    return popup
  })
    .catch(error => {
      // alert(path)
      error.path = path
      throw error
    })
}

const truncateByBytes = (str, maxBytes = 40) => {
  let result = ''

  for (let i = 0; i < str.length; i++) {
    const testStr = result + str[i]
    if (new Blob([testStr]).size <= maxBytes) {
      result = testStr
    } else {
      break
    }
  }

  return str.length > result.length ? `${result}...` : result
}

const forPress = function ({ el, obj = {}, down = () => true, move, up = () => { }, clearObjAtEnd = true }) {
  const rawMove = move
  const downEvent = function (e) {
    let moveAtFirst = true, moved = false

    if (!down(e, obj)) {
      return
    } //down返回false，则不运行move和up事件
    document.body.setAttribute('disselect', '')
    if (move) {
      move = (e) => {
        if (e.movementX === 0 && e.movementY === 0) return

        rawMove(e, obj, moveAtFirst)

        moveAtFirst = false
        moved = true
      }
    }
    const upEvent = function (e) {
      document.body.removeAttribute('disselect')
      move && document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', upEvent)

      try {
        up(e, obj, moved)
      } catch (errr) { }

      if (clearObjAtEnd) {
        Object.keys(obj).forEach(key => { delete obj[key] }) //清除obj
      }
    }

    move && document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', upEvent)
  }
  el.addEventListener('mousedown', downEvent)

  const releaser = () => {
    el.removeEventListener('mousedown', downEvent)
  } // 解除函数
  return releaser
}

const wait = (milliseconds) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve() // 解析 Promise
    }, milliseconds)
  })
}

const elementConnectedListener = (el, callback, time = 1000) => {
  const timeId = setInterval(() => {
    if (!el.isConnected) {
      clearInterval(timeId)
      callback()
    }
  }, time)

  return () => {
    clearInterval(timeId)
  }
}

const colonRegExp = /[:：꞉ː˸﹕︰]/
const isColon = (character = '') => (colonRegExp.test(character)) //检查单个字符 是否是冒号(国际化)
// const splitByColon = (str = '')=>(str.split(colonReg))

const globalClassNames = Object.freeze({
  collapsed: 'collapsed'
})//跨js文件用到的

const isGUID = (str) => {
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return guidRegex.test(str)
}

const getRandomId = () => Math.round(Math.random() * 1000000000000000).toString(36)

const removeEmoji = (() => {
  const reg = /^\p{Extended_Pictographic}/u
  return (str) => {
    if (!str?.length) return ''
    const ch = str
    if (reg.test(ch)) {
      return str.slice(2).trim()
    } else {
      return str.trim()
    }
  }
  // return str.replace(/\p{Extended_Pictographic}/gu, '') //應該只過濾前2個表情符號，不是整個句子。
  // return str.replace(/[\p{Emoji}\p{Extended_Pictographic}]/gu, '') 這個吧數字也過濾了
})()// 正則匹配大部分表情符號／特殊符號

const findAncestor = (el1, el2) => {
  if (!el1 || !el2) return undefined
  {
    const relation = el1.compareDocumentPosition(el2)

    if (relation & Node.DOCUMENT_POSITION_CONTAINED_BY) {
      return undefined //console.log('el1包含el2');
    } else if (relation & Node.DOCUMENT_POSITION_CONTAINS) {
      return undefined //相反
    }
  }
  const ancestors1 = new Set()
  let current = el1
  while (current) {
    ancestors1.add(current)
    current = current.parentElement
  }
  current = el2
  while (current) {
    if (ancestors1.has(current)) return current
    current = current.parentElement
  }
  return undefined
}

// const findAncestor2 = (ancestor, descendant) => {
//   if (!ancestor || !descendant) return undefined
//   let current = descendant
//   let prev = null
//   while (current && current !== ancestor) {
//     prev = current
//     current = current.parentElement
//   }
//   return current === ancestor ? prev : null
// }

const addEventListener2 = (el, type, listener, useCapture) => {
  el.addEventListener(type, listener, useCapture)
  return () => {
    el.removeEventListener(type, listener, useCapture)
  }
}

const flattenTree = (tree) => {
  const result = []
  function traverse(tree) {
    for (const item of tree) {
      result.push(item) // 1. 先把当前节点加入结果

      if (item.children && Array.isArray(item.children)) {
        traverse(item.children)
      }// 2. 如果有 children，递归遍历它们
    }
  }
  traverse(tree)

  return result
}

const clearObj = (obj, deep = false) => {
  for (key in obj) {
    deep && clearObj(obj[key])
    delete obj[key]
  }
  if (obj.constructor === Array) {
    obj.length = 0
  }
}

const isScroller = (el) => {
  const overflowY = getComputedStyle(el).overflowY
  return overflowY === 'auto' || overflowY === 'scroll'
}

//#endregion
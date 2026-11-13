//#region

window.fullScreenFn = (() => {
  const floatbar = '.catalogeu-navigation-plugin-floatbar'
  function getEffectiveColor(element, property) {
    let currentEl = element;
    let colors = [];

    // 收集元素链上的所有颜色
    while (currentEl && currentEl.nodeType === 1) { // 1 = Element node
      const style = getComputedStyle(currentEl);
      const color = style[property];
      if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
        colors.push(color);
      }
      if (property === 'backgroundColor' && color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
        break; // 对于背景色，找到第一个非透明的就可以停止
      }
      currentEl = currentEl.parentElement;
    }

    if (colors.length === 0 || colors[colors.length - 1].slice(0, 4) === 'rgba') {
      const baseColor = property === 'backgroundColor' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
      colors.push(baseColor)
    }

    // 如果只有一个颜色，直接返回
    if (colors.length === 1) {
      return colors[0];
    }

    // 从后向前合并颜色（从最底层开始）
    return colors.reverse().reduce((acc, color) => {
      return blendColors(acc, color);
    });
  }
  function blendColors(background, foreground) {
    // 解析颜色值
    const bg = parseColor(background);
    const fg = parseColor(foreground);

    // 如果前景色完全不透明，直接返回前景色
    if (fg.a === 1) {
      return `rgb(${fg.r}, ${fg.g}, ${fg.b})`;
    }

    // 计算混合后的颜色
    const a = 1 - (1 - fg.a) * (1 - bg.a);
    const r = Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a);
    const g = Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a);
    const b = Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a);

    return `rgb(${r}, ${g}, ${b})`;
  }
  function parseColor(color) {
    let m = color.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/);
    if (m) {
      return {
        r: parseInt(m[1]),
        g: parseInt(m[2]),
        b: parseInt(m[3]),
        a: m[4] === undefined ? 1 : parseFloat(m[4])
      };
    }
    return { r: 0, g: 0, b: 0, a: 1 }; // 默认值
  }

  const attr1 = 'plug-in-full-screen'
  let firstEl, el, clickStatus = 0, $shade, zoom = 1
  let remover

  function addStyle(newEl) {
    if (newEl === el) return

    el = newEl
    if (!$shade) {
      $shade = document.createElement('div')
      $shade.style = `transition:top 100ms,left 100ms,width 100ms,height 100ms;
              pointer-events: none;
              position: fixed;
              z-index: 100000000000000;
              top: 0;
              left: 0;
              width: 0;
              height: 0;
              padding: 0;
              margin: 0;
              background: rgb(255 238 0 / 27%);
              border: 4px solid rgb(5 6 251 / 46%);`
      $shade.innerHTML = `<span style="font-size:14px;position: absolute;left: -4px;top: -2.5em;white-space: nowrap;pointer-events: none;background: #000000c0;color: #fff;padding:0.2em 0.5em;border-radius: 2px;">${chrome.i18n.getMessage('capture')}</span>`
      document.body.appendChild($shade)
    }
    const { x, y, width, height } = el.getBoundingClientRect()
    $shade.style.top = `${y}px`
    $shade.style.left = `${x}px`
    $shade.style.height = `${height}px`
    $shade.style.width = `${width}px`
  }
  function removeStyle(el) {
    if (!el) return
    if ($shade) {
      $shade.remove()
      $shade = undefined
    }
  }
  function fullscreen() {
    remover && remover()
    if (!el || el.constructor === HTMLDialogElement) return //意外
    try {
      document.addEventListener('fullscreenchange', onFullscreenchange, true)
      el.requestFullscreen({ navigationUI: 'show' })//show参数不起作用，瀏覽器還未支持
    } catch (err) {
      document.removeEventListener('fullscreenchange', onFullscreenchange, true)
      throw err
    }
  }
  function setZoom(e) {
    if (e.ctrlKey) {
      e.preventDefault()
      e.stopPropagation()
      if (e.deltaY < 0) {
        zoom += 0.2
        zoom = zoom > 5 ? 5 : zoom
        el.style.zoom = zoom
      } else {
        zoom -= 0.2
        zoom = zoom < 0.5 ? 0.5 : zoom
        el.style.zoom = zoom
      }
    }
  }
  function showZoomReminder() {
    const dialog = document.createElement('dialog')
    dialog.classList.add('zoom-reminder')
    dialog.innerHTML = `
                                                <div>
                                                        <p>${chrome.i18n.getMessage('zoomPageTitle')}<span>${chrome.i18n.getMessage('zoomPageContent')}</span></p>
                                                </div>`

    document.querySelector(floatbar).appendChild(dialog)
    dialog.showModal()
    const clear = () => {
      dialog.close()
      dialog.remove()
    }
    dialog.children[0].addEventListener('mouseenter', () => { clearTimeout(timeId) })
    dialog.children[0].addEventListener('mouseleave', clear)
    const timeId = setTimeout(clear, 1000)
  }//縮放功能 提示
  function cancel(e) {
    e.stopPropagation()
    e.preventDefault()
    remover && remover()
  }
  function onMove(e) {
    if (clickStatus !== 0) return
    e.stopPropagation()
    e.preventDefault()

    let newEl = document.elementFromPoint(e.clientX, e.clientY)
    if (newEl.closest('dialog')) return
    {
      const code = newEl.closest('code')
      if (code) {
        newEl = code
      } else {
        while (true) {
          const tagName = newEl.tagName.toUpperCase()
          if (['P', 'SPAN', 'A', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'INPUT', 'LABEL', 'STRONG', 'B', 'I', 'U'].includes(tagName)) {
            newEl = newEl.parentElement
          } else {
            break
          }
        }
      }
    }
    firstEl = newEl
    addStyle(newEl)
  }
  function onDown(e) {
    if (e.button !== 0) return //不是左键
    e.stopPropagation()
    e.preventDefault()
    clickStatus = 1
  }
  function onUp(e) {
    if (clickStatus <= 0) return
    e.stopPropagation()
    e.preventDefault()

    clickStatus = -1
    fullscreen()
  }
  function onDrag(e) {
    if (clickStatus <= 0) return
    e.stopPropagation()
    e.preventDefault()

    clickStatus = 2

    {
      let parent = e.target
      while (parent) {
        const pos = parent.compareDocumentPosition(firstEl)
        if (parent === firstEl) {
          addStyle(parent)
          break
        } else if ((pos & Node.DOCUMENT_POSITION_CONTAINED_BY)) {
          addStyle(parent)
          break
        }
        parent = parent.parentElement
      }
    }
  }

  function onEscKeydown(e) {
    if (e.key.toUpperCase() !== 'ESCAPE') return //Escape
    cancel(e)
  }
  function onContextmenu(e) {
    cancel(e)
  }
  function onFullscreenchange(e) {
    if (document.fullscreenElement) {
      if (el !== document.documentElement) {
        el.setAttribute(attr1, '')
        const effectiveBackground = getEffectiveColor(el, 'backgroundColor')
        const effectiveColor = getEffectiveColor(el, 'color')
        el.style.setProperty('--fullscreen-background-color', effectiveBackground)
        el.style.setProperty('--fullscreen-text-color', effectiveColor)
      }

      showZoomReminder()

      window.removeEventListener("wheel", setZoom, { passive: false, capture: true }) //避免重複
      window.addEventListener("wheel", setZoom, { passive: false, capture: true })
    } else {
      if (el !== document.documentElement) {
        el.removeAttribute(attr1)
        el.style.removeProperty('--fullscreen-background-color')
        el.style.removeProperty('--fullscreen-text-color')
      }
      el.style.zoom = ''
      document.documentElement.style.zoom = ''

      window.removeEventListener("wheel", setZoom, { passive: false, capture: true })
      document.removeEventListener("fullscreenchange", onFullscreenchange, true)
    }
  }

  return Object.freeze({
    // end() {
    //         remover && remover()
    // },
    capturing(onCaptureFinally) {
      clickStatus = 0
      zoom = 1

      document.addEventListener('mousemove', onMove, true)
      document.addEventListener('mousedown', onDown, true)
      document.addEventListener('mousemove', onDrag, true)
      document.addEventListener('mouseup', onUp, true)
      document.addEventListener('keydown', onEscKeydown, true)
      document.addEventListener('contextmenu', onContextmenu, true)
      remover = () => {
        onCaptureFinally && onCaptureFinally({el})

        removeStyle(el)
        document.removeEventListener('mousemove', onMove, true)
        document.removeEventListener('mousedown', onDown, true)
        document.removeEventListener('mousemove', onDrag, true)
        document.removeEventListener('mouseup', onUp, true)
        document.removeEventListener('keydown', onEscKeydown, true)
        document.removeEventListener('contextmenu', onContextmenu, true)

        remover = undefined
        firstEl = undefined

        if ($shade) {
          $shade.remove()
          $shade = undefined
        }
      }
    },
    toFullscreen(element) {
      el = element || document.documentElement
      if (!document.fullscreenElement) {
        fullscreen()
      } else {
        document.exitFullscreen()
      }
    }
  })
})()

//#endregion
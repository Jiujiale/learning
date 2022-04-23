// 快速 diff
const { effect, ref } = VueReactivity

// function renderer(domString, container) {
//   container.innerHTML = domString
// }

// const count = ref(1)
// effect(() => {
//   renderer(`<h1>count: ${count.value}</h1>`, document.getElementById('app'))
// })
// count.value++
const Text = Symbol() // 代表文本节点type
const Comment = Symbol() // 代表注释节点type
const Fragment = Symbol() // 代表Fragment节点type

function lis(arr) {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }
      u = 0
      v = result.length - 1
      while (u < v) {
        c = ((u + v) / 2) | 0
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}

function shouldSetAsProps(el, key, value) {
  // 特殊处理 form
  if (el.tagName === 'INPUT' && key === 'form') return false
  return key in el
}

function createRenderer(options) {
  const {
    createElement,
    setElementText,
    insert,
    patchProps,
    setText,
    createText,
    createComment
  } = options

  function patch(n1, n2, container, anchor = null) {
    if (n1 && n1.type !== n2.type) {
      unmount(n1)
      n1 = null
    }
    const { type } = n2
    if (type === Text) {
      // 文件节点
      if (!n1) {
        const el = n2.el = createText(n2.children)
        insert(el, container)
      } else {
        const el = n2.el = n1.el
        if (n2.children != n1.children) {
          setText(el, n2.children)
        }
      }
    } else if (type === Comment) {
      // 注释节点
      if (!n1) {
        const el = n2.el = createComment(n2.children)
        insert(el, container)
      } else {
        const el = n2.el = n1.el
        if (n2.children != n1.children) {
          setText(el, n2.children)
        }
      }
    } else if (type === Fragment) {
      // Fragment节点
      if (!n1) {
        n2.children.forEach(c => patch(null, c, container))
      } else {
        patchChildren(n1, n2, container)
      }
    } else if (typeof type === 'string') {
      // n1 不存在意味着 挂载
      if(!n1) {
        mountElement(n2, container, anchor)
      } else {
        patchElement(n1, n2)
      }
    } else if (typeof type === 'object') {
      // n2 是组件 
    } else if (typeof type === 'xxx') {
      // n2 是其他类型
    }
    
  }
  function patchElement(n1, n2) {
    const el = n2.el = n1.el
    const oldProps = n1.props
    const newProps = n2.props
    
    // step 1
    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        patchProps(el, key, oldProps[key], newProps[key])
      }
    }
    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProps(el, key, oldProps[key], null)
      }
    }

    // step 2
    patchChildren(n1, n2, el)
  }
  /**
   * 
   * @param {*} n1 oldNode
   * @param {*} n2 newNode
   * @param {*} container 
   */
  function patchChildren(n1, n2, container) {
    if (typeof n2.children === 'string') {
      if (Array.isArray(n1.children)) {
        n1.children.forEach(e => unmount(e))
      }
      setElementText(container, n2.children)
    } else if (Array.isArray(n2.children)) {
      patchKeyedChildren(n1, n2, container)
      // 暴力但通用
      // if (Array.isArray(n1.children)) {
      //   n1.children.forEach(c => unmount(c))
      //   n2.children.forEach(c => patch(null, c, container))
      // } else {
      //   setElementText(container, '')
      //   n2.children.forEach(c => patch(null, c, container))
      // }
    } else {
      if (Array.isArray(n1.children)) {
        n1.children.forEach(c => unmount(c))
      } else if (typeof n1.children === 'string') {
        setElementText(container, '')
      }
    }
  }
  // 快速 diff
  function patchKeyedChildren(n1, n2, container) {
    let oldChildren = n1.children
    let newChildren = n2.children
    // 新旧两组子节点的开头
    // 前置节点
    let j = 0
    let oldNode = oldChildren[j]
    let newNode = newChildren[j]
    while (oldNode.key === newNode.key) {
      patch(oldNode, newNode, container)
      j++
      oldNode = oldChildren[j]
      newNode = newChildren[j]
    }

    // 后置节点
    let oldEnd = oldChildren.length - 1
    let newEnd = newChildren.length - 1
    oldNode = oldChildren[oldEnd]
    newNode = newChildren[newEnd]
    while (oldNode.key === newNode.key) {
      patch(oldNode, newNode, container)
      oldEnd --
      newEnd --
      oldNode = oldChildren[oldEnd]
      newNode = newChildren[newEnd]
    }

    // 处理新增
    if (j > oldEnd && j <= newEnd) {
      const anchorIndex = newEnd + 1
      const anchor = anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null
      while(j <= newEnd) {
        patch(null, newChildren[j++], container, anchor)
      }
    } else if (j > newEnd && j <= oldEnd) {
      // 处理多余节点
      while (j <= oldEnd) {
        unmount(oldChildren[j++])
      }
    } else {
      // 处理非理想情况
      // 构造source数组
      const count = newEnd - j + 1
      const source = new Array(count)
      source.fill(-1)

      // oldStart 和 newStart 
      const oldStart = j
      const newStart = j

      console.log('jjj', j)

      let needMove = false
      let pos = 0

      // 方式 1 时间复杂度有点高
      // for(let i = oldStart; i <= oldEnd; i ++) {
      //   const oldNode = oldChildren[i]

      //   for(let k = newStart; k <= newEnd; k++) {
      //     const newNode = newChildren[k]
      //     if (oldNode.key === newNode.key) {
      //       patch(oldNode, newNode, container)
      //       source[k - newStart] = i
      //     }
      //   }
      // }

      // 方式 2
      const keyIndex = {}
      for(let k = newStart; k <= newEnd; k ++) {
        keyIndex[newChildren[k].key] = k
      }
      let patched = 0
      for(let i = oldStart; i <= oldEnd; i ++) {
        const oldNode = oldChildren[i]
        if (patched <= count) {
          const k = keyIndex[oldNode.key]
          if (typeof k !== 'undefined') {
            const newNode = newChildren[k]
            patch(oldNode, newNode, container)
            source[k - newStart] = i
            console.log('k: ', k)
            console.log('pos: ', pos)
            console.log(`source[${k-newStart}] = ${i}`)
            patched ++
            if (k < pos) {
              console.log('need move ===========')
              needMove = true
            } else {
              pos = k
            }
          } else {
            unmount(oldNode)
          }
        } else {
          unmount(oldNode)
        }
      }
      if (needMove) {
        const seq = lis(source)
        console.log(seq)
        // 最长递增子序列最后一个元素
        let s = seq.length - 1
        // 新一组子节点最后一个元素
        let i = count - 1
        for(i; i >=0; i--) {
          if (source[i] === -1) {
            // 插入新节点
            const pos = i + newStart
            const newNode = newChildren[pos]

            const nextPos = pos + 1
            const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null
            patch(null, newNode, container, anchor)
          } else if (i !== seq[s]) {
            // 需要移动
            const pos = i + newStart
            const newNode = newChildren[pos]
            const nextPos = pos + 1
            const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null
            insert(newNode.el, container, anchor)
          } else {
            // 不需要移动
            s--
          }
        }
      }
    }
  }
  function mountElement(vnode, container, anchor = null) {
    const el = vnode.el = createElement(vnode.type)
    if (typeof vnode.children === 'string') {
      setElementText(el, vnode.children)
    } else if (Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        patch(null, child, el)
      })
    }
    if (vnode.props) {
      // 方式 1
      // for(const key in vnode.props) {
      //   el[key] = vnode.props[key]
      // }
      // 方式 2
      // for(const key in vnode.props) {
      //   el.setAttribute(key, vnode.props[key])
      // }
      // 方式 3
      for(const key in vnode.props) {
        patchProps(el, key, null, vnode.props[key])
      }
    }
    
    insert(el, container, anchor)
  }
  function unmount(vnode) {
    if (vnode.type === Fragment) {
      vnode.children.forEach(c => unmount(c))
      return
    }
    const parent = vnode.el.parentNode
    if (parent) {
      parent.removeChild(vnode.el)
    }
  }
  function render(vnode, container) {
    if (vnode) {
      patch(container._vnode, vnode, container)
    } else {
      if (container._vnode) {
        unmount(container._vnode)
      }
    }
    container._vnode = vnode
  }
  return {
    render
  }
}

const renderer = createRenderer({
  createElement(tag) {
    return document.createElement(tag)
  },
  setElementText(el, text) {
    el.textContent = text
  },
  createText(text) {
    return document.createTextNode(text)
  },
  createComment(text) {
    return document.createComment(text)
  },
  setText(el, text) {
    el.nodeValue = text
  },
  insert(el, parent, anchor = null) {
    console.log('==== el', el, parent, anchor)
    parent.insertBefore(el, anchor)
  },
  patchProps(el, key, preValue, nextValue) {
    if (/^on/.test(key)) {
      const name = key.slice(2).toLowerCase()
      const invokers = el._evi || (el._evi = {})
      let invoker = invokers[key]
      if (nextValue) {
        if (!invoker) {
          invoker = el._evi[key] = (e) => {
            if (e.timeStamp < invoker.attached) return
            if (Array.isArray(invoker.value)) {
              invoker.value.forEach(fn => fn(e))
            }else {
              invoker.value(e)
            }
          }
          invoker.value = nextValue
          invoker.attached = performance.now()
          el.addEventListener(name, invoker)
        } else {
          invoker.value = nextValue
        }
      } else if (invoker) {
        el.removeEventListener(name, invoker)
      }
    } else if (key === 'class') {
      el.className = nextValue || ''
    } else if (shouldSetAsProps(el, key, nextValue)) {
      const type = typeof el[key]
      const value = nextValue
      if (type === 'boolean' && value === '') {
        el[key] = true
      } else {
        el[key] = value
      }
    } else {
      el.setAttribute(key, nextValue)
    }
  }
})

// case 1
const vnode1 = {
  type: Fragment,
  children: [
    {
      type: 'p',
      key: '1',
      children: 'p-1'
    },
    {
      type: 'p',
      key: '2',
      children: 'p-2'
    },
    {
      type: 'p',
      key: '3',
      children: 'p-3'
    },
    {
      type: 'p',
      key: '4',
      children: 'p-4'
    },
    {
      type: 'p',
      key: '6',
      children: 'p-6'
    },
    {
      type: 'p',
      key: '5',
      children: 'p-5'
    }
  ]
}
const vnode2 = {
  type: Fragment,
  children: [
    {
      type: 'p',
      key: '1',
      children: 'new p-1'
    },
    {
      type: 'p',
      key: '3',
      children: 'new p-3'
    },
    {
      type: 'p',
      key: '2',
      children: 'new p-2'
    },
    {
      type: 'p',
      key: '4',
      children: 'new p-4'
    },
    {
      type: 'p',
      key: '7',
      children: 'new p-7'
    },
    {
      type: 'p',
      key: '5',
      children: 'new p-5'
    }
  ]
}
renderer.render(vnode1, document.getElementById('app'))
setTimeout(() => {
  renderer.render(vnode2, document.getElementById('app'))
}, 3000)

// case 2
// const vnode3 = {
//   type: Fragment,
//   children: [
//     {
//       type: 'p',
//       key: '1',
//       children: 'p-1'
//     },
//     {
//       type: 'p',
//       key: '2',
//       children: 'p-2'
//     },
//     {
//       type: 'p',
//       key: '3',
//       children: 'p-3'
//     }
//   ]
// }
// const vnode4 = {
//   type: Fragment,
//   children: [
//     {
//       type: 'p',
//       key: '1',
//       children: 'new p-1'
//     },
//     {
//       type: 'p',
//       key: '5',
//       children: 'new p-5'
//     },
//     {
//       type: 'p',
//       key: '3',
//       children: 'new p-3'
//     },
//     {
//       type: 'p',
//       key: '4',
//       children: 'new p-4'
//     },
//   ]
// }
// renderer.render(vnode3, document.getElementById('case'))
// setTimeout(() => {
//   renderer.render(vnode4, document.getElementById('case'))
// }, 3000)

// ssr ======================
const VOID_TAGS = 'area,base,br,col,embed,hr,img,input,link,meta,param,source,track,wbr'

const vNode = {
  type: 'div',
  props: {
    id: 'foo'
  },
  children: [
    { type: 'p', children: 'hello', props: { disabled: 'true'} }
  ]
}
function renderElementVNode2(vnode) {
  const {type: tag, props, children} = vnode

  const isVoidElement = VOID_TAGS.includes(tag)

  let ret = `<${tag}`
  if (props) {
    ret += renderAttrs(props)
  }

  ret += isVoidElement ? '/>' : '>'
  if (isVoidElement) return ret
  if (typeof children === 'string') {
    ret += children
  } else if (Array.isArray(children)) {
    children.forEach(child => {
      ret += renderElementVNode2(child)
    })
  }

  ret += `</${tag}>`

  return ret
}

const shouldIgnoreProp = ['key', 'ref']

function renderAttrs(props) {
  let ret = ''
  for (let key in props) {
    if (shouldIgnoreProp.includes(key) || /^on[^a-z]/.test(key)) continue
    const value = props[key]
    ret += renderDynamicAttr(key, value) 
  }
  return ret
}
const isBooleanAttr = (key) => 
  `allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,default,defaultchecked,defaultmuted,defaultselected,defer,disabled,enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,required,reversed,scoped,seamless,selected,sortable,translate,truespeed,typemustmatch,visible`.split(',').includes(key)

const isSSRSafeAttrName = (key) => /[>/="'\u0009\u000a\u000c\u000d\u0020]/.test(key)
function renderDynamicAttr(key, value) {
  if (isBooleanAttr(key)) {
    return value === false ? '' : ` ${key}`
  } else if(isSSRSafeAttrName(key)) {
    return value === '' ? ` ${key}` : ` ${key}="${escapeHtml(value)}"`
  } else {
    // 原本是error 处理 暂时这么写
    // return ''
    return ` ${key}="${escapeHtml(value)}"`
  }
}

const escapeRE = /["'&<>]/
function escapeHtml(string) {
  const str = '' + string
  const match = escapeRE.exec(str)

  if (!match) {
    return str
  }

  let html = ''
  let escaped
  let index
  let lastIndex = 0
  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escaped = '&quot;'
        break
      case 38: // &
        escaped = '&amp;'
        break
      case 39: // '
        escaped = '&#39;'
        break
      case 60: // <
        escaped = '&lt;'
        break
      case 62: // >
        escaped = '&gt;'
        break
      default:
        continue
    }

    if (lastIndex !== index) {
      html += str.substring(lastIndex, index)
    }

    lastIndex = index + 1
    html += escaped
  }

  return lastIndex !== index ? html + str.substring(lastIndex, index) : html
}


console.log(renderElementVNode2(vNode))
console.log('isBooleanAttr', isBooleanAttr('disabled'))
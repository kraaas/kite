import {
  getAttrsArray,
  nodeToFragment,
  isNodeType,
  isTextType,
  hasAttr,
  each
} from './util'
import Directives from './directives'

const mustacheReg = /(\{\{.*\}\})|(\{\{\{.*\}\}\})/
const singleMustacheReg = /\{\{|\}\}|\{\{\{|\}\}\}/g
const splitExpReg = /(\{\{[^\}\}]+\}\})/

function isDirective(name) {
  return name.indexOf('k-') > -1
}

function getDirectives(node) {
  let attrs = getAttrsArray(node)
  let name, expression, params, directives = []
  attrs.forEach((attr) => {
    name = attr.name
    expression = attr.value
    if (isDirective(name)) {
      params = getDirectiveParam(name)
      name = name.replace(/k-([a-z]+):.*/g, '$1')
      directives.push({
        name,
        params,
        expression
      })
    }
  })
  return directives
}

function getDirectiveParam(name) {
  return name.split(':').splice(1)
}

function hasDirective(node) {
  let attrs, i, text = node.textContent
  if (isNodeType(node)) {
    attrs = node.attributes
    i = attrs.length
    while (i--) {
      if (isDirective(attrs[i].name)) {
        return true
      }
    }
  } else if (isTextType(node)) {
    return mustacheReg.test(text)
  }
}

function isLateCompile(node) {
  return hasAttr(node, 'k-if') || hasAttr(node, 'k-for') || hasAttr(node, 'k-pre');
}

export default class Compile {
  constructor(vm, el) {
    this.vm = vm
    this.vm._compiler = this
    this._unCompileNodes = []
    this._fragment = nodeToFragment(el)
    this.init()
  }

  init() {
    this.compile(this._fragment, true)
  }

  compile(el, root, scope) {
    const childNodes = el.childNodes
    let node, i = childNodes.length
    if (root) {
      this._unCompileNodes = []
      if (hasDirective(el)) {
        this._unCompileNodes.push([el, scope])
      }
    }
    while (i--) {
      node = childNodes[i]
      if (hasDirective(node)) {
        this._unCompileNodes.push([node, scope])
      }
      if (node.hasChildNodes() && !isLateCompile(node)) {
        this.compile(node)
      }
    }
    if (root) {
      this.compileNodes(this._unCompileNodes)
    }
  }

  compileNodes(nodes) {
    each(nodes, item => {
      const node = item[0]
      const scope = item[1]
      if (isNodeType(node)) {
        this.compileDirective(node, scope)
      } else if (isTextType(node)) {
        this.compileText(node, scope)
      }
    })
  }

  compileDirective(node, scope) {
    let directves = getDirectives(node)
    directves.forEach(directve => {
      const Directive = Directives[directve.name]
      if (Directive) {
        new Directive(this.vm, node, scope, directve.expression, directve.params)
      }
    })
  }

  // static {{exp}} static => 'static' + (exp) + 'static'
  compileText(node, scope) {
    const textContent = node.textContent
    let clips = textContent.split(splitExpReg)
    let expression, expressionClips
    expressionClips = clips.map((clip) => {
      if (mustacheReg.test(clip)) {
        clip = clip.replace(singleMustacheReg, '')
        return clip
      } else {
        return `'${clip}'`
      }
    })
    expression = expressionClips.join('+')
    new Directives.text(this.vm, node, scope, expression)
  }



}

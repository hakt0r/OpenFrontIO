import { consume } from '@lit/context'
import { EditorStore, editorContext } from '../editor-store'
import { EditorEngine } from '../engine'
import { LitElement } from 'lit'
import { property } from 'lit/decorators.js'
import type { MapEditor } from '..'

declare global {
  interface Document {
    tailwindSource: HTMLStyleElement
    tailwindBlob: Blob
    tailwindObjectURL: string
  }
}

const readTailwindSource = () => {
  const stylesheet = Array.from(document.head.querySelectorAll('style')!).filter((style) =>
    style?.textContent?.includes('p-2'),
  )[0]
  if (!stylesheet) debugger
  document.tailwindSource = stylesheet
  document.tailwindBlob = new Blob([stylesheet.textContent!], { type: 'text/css' })
  document.tailwindObjectURL = URL.createObjectURL(document.tailwindBlob)
}

export class TailwindElement extends LitElement {
  @consume({ context: editorContext, subscribe: false }) @property({ attribute: false }) public context!: EditorStore
  @property({ type: Object }) styles = styles

  private styleTag: HTMLLinkElement = null as unknown as HTMLLinkElement
  protected props: Array<string> = null as unknown as Array<string>
  private _contextSubscriptions: Array<() => void> = []

  public get editor(): MapEditor {
    return this.context.editor.value
  }

  public get engine(): EditorEngine | null {
    return this.context.engine.value
  }

  // Event dispatching helpers
  protected emit<T = any>(eventName: string, detail?: T, options?: CustomEventInit) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      composed: true,
      ...options,
    })
    this.dispatchEvent(event)
    return event
  }

  protected emitError(message: string) {
    return this.emit('error', { message })
  }

  protected emitChange<T = any>(value: T, field?: string) {
    return this.emit('change', { value, field })
  }

  protected emitAction(action: string, data?: any) {
    return this.emit('action', { action, data })
  }

  connectedCallback() {
    super.connectedCallback()
    this._setupContextSubscriptions()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._cleanupContextSubscriptions()
  }

  private _setupContextSubscriptions() {
    if (!this.context || !this.props) return

    // Subscribe only to the specific context properties defined in props
    for (const prop of this.props) {
      if (this.context[prop] && typeof this.context[prop].subscribe === 'function') {
        const unsubscribe = this.context[prop].subscribe(() => {
          this.requestUpdate()
        })
        this._contextSubscriptions.push(unsubscribe)
      }
    }
  }

  private _cleanupContextSubscriptions() {
    this._contextSubscriptions.forEach(unsubscribe => unsubscribe())
    this._contextSubscriptions = []
  }

  createRenderRoot() {
    return this.attachShadow({ mode: 'open' })
  }

  shouldUpdate(changedProperties: Map<string | number | symbol, unknown>) {
    // If no specific props are defined, use default behavior
    if (!this.props) return super.shouldUpdate(changedProperties)
    
    // Check if context changed
    if (changedProperties.has('context')) {
      // If component defines specific props to watch, only update if those props changed
      if (this.props.length > 0) {
        // Check if any of the watched context properties changed
        const previousContext = changedProperties.get('context') as EditorStore
        if (!previousContext) return true // First time, should update
        
        for (const prop of this.props) {
          if (previousContext[prop]?.value !== this.context[prop]?.value) {
            return true
          }
        }
        return false // None of the watched props changed
      }
    }
    
    return super.shouldUpdate(changedProperties)
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (!document.tailwindSource) readTailwindSource()
    if (!this.styleTag) {
      this.styleTag = document.createElement('link')
      this.styleTag.rel = 'stylesheet'
      this.styleTag.href = document.tailwindObjectURL
    }
    if (!this.shadowRoot?.children[0]?.isEqualNode(this.styleTag)) {
      this.styleTag.remove()
      this.shadowRoot?.prepend(this.styleTag)
    }
  }
}

export const styles: StyleMap = {}

export type StyleMap = {
  [key: string]: string | StyleMap | null
}

import { consume } from '@lit/context'
import { EditorStore, editorContext, type EditorStoreKey } from '../editor-store'
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
  if (!stylesheet) throw new Error('Tailwind stylesheet not found')
  document.tailwindSource = stylesheet
  document.tailwindBlob = new Blob([stylesheet.textContent!], { type: 'text/css' })
  document.tailwindObjectURL = URL.createObjectURL(document.tailwindBlob)
}

export class TailwindElement extends LitElement {
  @consume({ context: editorContext, subscribe: true })
  @property({ attribute: false }) public context!: EditorStore
  @property({ type: Object }) styles = styles

  private styleTag: HTMLLinkElement = null as unknown as HTMLLinkElement
  protected props: Array<EditorStoreKey> = []
  private unsubscribeCallbacks: Array<() => void> = []

  public get editor(): MapEditor {
    return this.context.editor.value
  }

  public get engine(): EditorEngine | null {
    return this.context.engine.value
  }

  connectedCallback() {
    super.connectedCallback()
    
    // Auto-subscribe to signals declared in props
    if (this.props.length > 0) {
      this.unsubscribeCallbacks = this.props.map(propKey => 
        this.context[propKey].subscribe(() => this.requestUpdate())
      )
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    
    // Auto-cleanup subscriptions
    this.unsubscribeCallbacks.forEach(unsubscribe => unsubscribe())
    this.unsubscribeCallbacks = []
  }

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

  createRenderRoot() {
    return this.attachShadow({ mode: 'open' })
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

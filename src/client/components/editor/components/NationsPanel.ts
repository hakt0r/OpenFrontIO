import './Bezel'
import { LitElement, html, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import type { Nation } from '../../../../core/game/TerrainMapLoader'
import type { MapEditor } from '../index'
import { TailwindElement } from './TailwindElement'
import type { EditorStoreKey } from '../context'

@customElement('nations-panel')
export class NationsPanel extends TailwindElement {
  protected props: Array<EditorStoreKey> = ['mapState', 'isNationsVisible']
  @state() isOpen = true

  get nations(): Nation[] {
    return this.context.mapState.value.nations || []
  }

  show() {
    this.isOpen = true
    this.context.isNationsVisible.value = true
  }

  hide() {
    this.isOpen = false
    this.context.isNationsVisible.value = false
  }

  render() {
    if (!this.isOpen || !this.context.isNationsVisible.value) return nothing

    return html`
      <bezel-panel class="w-65 max-h-[calc(100vh-8rem)]">
        <div class="flex items-center justify-between pb-2 border-b border-editor-border">
          <div class="text-xs font-semibold text-editor-secondary uppercase tracking-wider">Nations (${this.nations.length})</div>
        </div>
        
        <div class="flex flex-col gap-2 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-editor-component-background [&::-webkit-scrollbar-thumb]:bg-editor-border [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-editor-secondary-hover">
          ${
            this.nations.length === 0
              ? html`
              <div class="flex flex-col items-center justify-center py-10 px-5 text-editor-secondary text-center gap-2">
                <div class="text-3xl opacity-50">🏛️</div>
                <div class="text-sm font-medium text-editor-secondary">No nations yet</div>
                <div class="text-xs text-editor-secondary leading-relaxed">Select the nation tool and click on the map to place nations</div>
              </div>
            `
              : this.nations.map(
                  (nation, _index) => html`
              <div class="flex items-center justify-between p-2.5 bg-editor-secondary-background rounded-md border border-editor-border transition-all duration-200 ease-in-out hover:bg-editor-tertiary-background hover:border-editor-secondary-hover">
                <div class="flex flex-col gap-1 flex-1">
                  <div class="text-sm font-semibold text-editor-text mb-0.5">${nation.name}</div>
                  <div class="flex gap-2 items-center">
                    <span class="text-xs text-editor-secondary bg-editor-tertiary-background px-1.5 py-0.5 rounded">🏴 ${nation.flag}</span>
                    <span class="text-xs text-editor-secondary bg-editor-tertiary-background px-1.5 py-0.5 rounded">💪 ${nation.strength}</span>
                  </div>
                  <div class="text-xs text-editor-secondary font-mono">
                    📍 ${nation.coordinates[0]}, ${nation.coordinates[1]}
                  </div>
                </div>
                <div class="flex gap-1 items-center">
                  <tool-button
                    .icon=${'🔍'}
                    @click=${() => this.zoomToNation(nation)}
                    title="Zoom to nation"
                  ></tool-button>
                  <tool-button
                    .icon=${'✏️'}
                    @click=${() => this.editNation(nation)}
                    title="Edit nation"
                  ></tool-button>
                  <tool-button
                    .icon=${'🗑️'}
                    @click=${() => this.deleteNation(nation)}
                    title="Delete nation"
                  ></tool-button>
                </div>
              </div>
            `
                )
          }
        </div>
      </bezel-panel>
    `
  }

  private zoomToNation(nation: Nation): void {
    const x = nation.coordinates[0]
    const y = nation.coordinates[1]

    const canvas = this.editor.canvas
    if (!canvas) return

    const transform = {
      zoom: 4.0,
      panX: x * -4.0 + canvas.width / 2,
      panY: y * -4.0 + canvas.height / 2
    }

    this.editor.updateTransform(transform)
  }

  private editNation(nation: Nation): void {
    this.context.editingNation.value = nation
    this.context.isEditingNation.value = true
    this.context.pendingNationCoords.value = null
    this.context.isNationVisible.value = true
  }

  private deleteNation(nation: Nation): void {
    if (confirm(`Are you sure you want to delete "${nation.name}"?`)) {
      const currentMapState = this.context.mapState.value
      if (!currentMapState) return

      const newNations = currentMapState.nations.filter((n) => n !== nation)
      this.context.mapState.value = {
        ...currentMapState,
        nations: newNations
      }
    }
  }
}

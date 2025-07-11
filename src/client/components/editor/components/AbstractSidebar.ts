import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { sidebarStyles } from "../TerrainPanel/styles";
import { buttonStyles } from "../styles/buttons.styles";

export interface SidebarTool {
	id: string;
	name: string;
	emoji: string;
	title: string;
}

export interface SidebarBrush {
	id: string;
	name: string;
	emoji: string;
	title: string;
}

export interface SidebarControl {
	id: string;
	name: string;
	type: "range" | "number" | "select";
	value: number | string;
	min?: number;
	max?: number;
	step?: number;
	options?: { value: string | number; label: string }[];
	helpText?: string;
}

export interface SidebarConfig {
	tools: SidebarTool[];
	brushes: SidebarBrush[];
	controls: SidebarControl[];
}

@customElement("abstract-sidebar")
export class AbstractSidebar extends LitElement {
	@property({ type: Object }) config!: SidebarConfig;
	@property({ type: String }) currentTool!: string;
	@property({ type: String }) currentBrush!: string;
	@property({ type: Object }) controlValues!: Record<string, number | string>;

	static styles = css`
    ${sidebarStyles}
    ${buttonStyles}
    
    .brush-control-info {
      margin-top: 4px;
      text-align: center;
    }
    
    .brush-control-info span {
      font-size: 0.75em;
      color: #666;
      font-style: italic;
    }
  `;

	private _dispatchToolChange(toolId: string) {
		this.dispatchEvent(
			new CustomEvent("tool-change", {
				detail: { toolId },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _dispatchBrushChange(brushId: string) {
		this.dispatchEvent(
			new CustomEvent("brush-change", {
				detail: { brushId },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _dispatchControlChange(controlId: string, value: number | string) {
		this.dispatchEvent(
			new CustomEvent("control-change", {
				detail: { controlId, value },
				bubbles: true,
				composed: true,
			}),
		);
	}

	render() {
		return html`
      <div class="left-brush-panel">
        ${
					this.config.tools.length > 0
						? html`
          <div class="brush-panel-section">
            <div class="brush-panel-title">Tools</div>
            <div class="tool-grid">
              ${this.config.tools.map(
								(tool) => html`
                <button 
                  class="tool-button ${this.currentTool === tool.id ? "active" : ""}"
                  @click=${() => this._dispatchToolChange(tool.id)}
                  title="${tool.title}"
                >${tool.emoji}</button>
              `,
							)}
            </div>
          </div>
        `
						: ""
				}

        ${
					this.config.brushes.length > 0
						? html`
          <div class="brush-panel-section">
            <div class="brush-panel-title">Brushes</div>
            <div class="brush-grid">
              ${this.config.brushes.map(
								(brush) => html`
                <button 
                  class="e-button ${this.currentBrush === brush.id ? "active" : ""}"
                  @click=${() => this._dispatchBrushChange(brush.id)}
                  title="${brush.title}"
                >${brush.emoji}</button>
              `,
							)}
            </div>
          </div>
        `
						: ""
				}

        ${this.config.controls.map(
					(control) => html`
          <div class="brush-panel-section brush-size-section">            
            ${
							control.type === "range"
								? html`
              <div class="brush-size-display">
                <span>${control.name}</span>
                <span class="brush-size-value">${this.controlValues[control.id] || control.value}</span>
              </div>
              <input 
                type="range" 
                min="${control.min || 0}" 
                max="${control.max || 100}" 
                step="${control.step || 1}"
                .value=${(this.controlValues[control.id] || control.value).toString()}
                @input=${(e: Event) => this._dispatchControlChange(control.id, Number.parseInt((e.target as HTMLInputElement).value))}
                class="brush-size-slider"
              />
              <div class="brush-size-display">
                <span>${control.min || 0}</span>
                <span>${control.max || 100}</span>
              </div>
            `
								: control.type === "number"
									? html`
              <input 
                type="number" 
                min="${control.min || 0}" 
                max="${control.max || 100}" 
                step="${control.step || 1}"
                .value=${(this.controlValues[control.id] || control.value).toString()}
                @input=${(e: Event) => this._dispatchControlChange(control.id, Number.parseInt((e.target as HTMLInputElement).value))}
                class="brush-size-input"
              />
            `
									: control.type === "select"
										? html`
              <select 
                .value=${(this.controlValues[control.id] || control.value).toString()}
                @change=${(e: Event) => this._dispatchControlChange(control.id, (e.target as HTMLSelectElement).value)}
                class="brush-select"
              >
                ${(control.options || []).map(
									(option) => html`
                  <option value="${option.value}">${option.label}</option>
                `,
								)}
              </select>
            `
										: ""
						}
            
            ${
							control.helpText
								? html`
              <div class="brush-control-info">
                <span>${control.helpText}</span>
              </div>
            `
								: ""
						}
          </div>
        `,
				)}
      </div>
    `;
	}
}

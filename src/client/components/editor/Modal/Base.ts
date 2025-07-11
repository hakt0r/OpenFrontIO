import { LitElement, html, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import type { ErrorEvent } from "../types/MapEditorTypes";
import { baseModalStyles } from "./Base.styles";

export abstract class BaseModal extends LitElement {
	@property({ type: Boolean }) open = false;
	@state() protected errorMessage = "";

	static styles = baseModalStyles;

	protected dispatchError(message: string): void {
		this.errorMessage = message;
		this.dispatchEvent(
			new CustomEvent("error", {
				detail: { message } satisfies ErrorEvent,
			}),
		);
	}

	protected clearError(): void {
		this.errorMessage = "";
	}

	protected close(): void {
		this.open = false;
		this.clearError();
		this.dispatchEvent(new CustomEvent("close"));
	}

	protected abstract getTitle(): string;
	protected abstract getContent(): TemplateResult;
	protected abstract getActions(): TemplateResult;

	protected getModalClasses(): string {
		return "modal-content";
	}

	protected getBodyClasses(): string {
		return "modal-body";
	}

	render() {
		if (!this.open) return html``;

		return html`
      <div class="modal-overlay" @click=${this.close}>
        <div class="${this.getModalClasses()}" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">${this.getTitle()}</div>
          
          <div class="${this.getBodyClasses()}">
            ${this.getContent()}
            
            ${
							this.errorMessage
								? html`
              <div class="error-message">${this.errorMessage}</div>
            `
								: ""
						}
            
            <div class="modal-actions">
              ${this.getActions()}
            </div>
          </div>
        </div>
      </div>
    `;
	}
}

import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { errorToastStyles } from "./styles.js";

@customElement("error-toast")
export class ErrorToast extends LitElement {
	@property({ type: String }) message = "";
	@property({ type: Boolean }) visible = false;

	static styles = errorToastStyles;

	private hideTimeout: number | null = null;

	updated(changedProperties: Map<string, unknown>): void {
		if (changedProperties.has("visible") && this.visible) {
			this.autoHide();
		}
	}

	private autoHide(): void {
		if (this.hideTimeout) {
			clearTimeout(this.hideTimeout);
		}

		this.hideTimeout = window.setTimeout(() => {
			this.hide();
		}, 5000);
	}

	private hide(): void {
		this.visible = false;
		this.dispatchEvent(new CustomEvent("hide"));
	}

	render() {
		if (!this.message) return html``;

		return html`
      <div 
        class="error-toast ${this.visible ? "visible" : ""}" 
        @click=${this.hide}
      >
        ❌ ${this.message}
      </div>
    `;
	}
}

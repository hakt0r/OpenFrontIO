import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { EventBus, GameEvent } from "../../../core/EventBus";
import { getServerConfigFromClient } from "../../../core/configuration/ConfigLoader";
import { getGamesPlayed } from "../../Utils";
import { Layer } from "./Layer";

export class GutterAdModalEvent implements GameEvent {
  constructor(public readonly isVisible: boolean) {}
}

@customElement("gutter-ad-modal")
export class GutterAdModal extends LitElement implements Layer {
  public eventBus: EventBus;

  @state()
  private isVisible: boolean = false;

  @state()
  private adLoaded: boolean = false;

  private leftAdType: string = "left_rail";
  private rightAdType: string = "right_rail";
  private leftContainerId: string = "gutter-ad-container-left";
  private rightContainerId: string = "gutter-ad-container-right";
  private margin: string = "10px";
  private adsEnabled: boolean = false;

  // Override createRenderRoot to disable shadow DOM
  createRenderRoot() {
    return this;
  }

  async init() {
    const config = await getServerConfigFromClient();
    this.adsEnabled = config.adsEnabled();
    
    if (getGamesPlayed() > 1) {
      this.eventBus.on(GutterAdModalEvent, (event) => {
        if (event.isVisible) {
          this.show();
        } else {
          this.hide();
        }
      });
    }
  }

  tick() {}

  static styles = css``;

  // Called after the component's DOM is first rendered
  firstUpdated() {
    // DOM is guaranteed to be available here
  }

  public show(): void {
    this.isVisible = true;
    this.requestUpdate();

    // Wait for the update to complete, then load ads
    this.updateComplete.then(() => {
      this.loadAds();
    });
  }

  public hide(): void {
    this.isVisible = false;
    this.destroyAds();
    this.adLoaded = false;
    this.requestUpdate();
  }

  private loadAds(): void {
    if (!this.adsEnabled) {
      this.hide();
      return;
    }
    
    // Ensure the container elements exist before loading ads
    const leftContainer = this.querySelector(`#${this.leftContainerId}`);
    const rightContainer = this.querySelector(`#${this.rightContainerId}`);

    if (!leftContainer || !rightContainer) {
      if (this.adsEnabled) {
        console.warn("Ad containers not found in DOM");
      }
      return;
    }

    if (!window.ramp) {
      if (this.adsEnabled) {
        console.warn("Playwire RAMP not available");
      }
      this.hide();
      return;
    }

    if (this.adLoaded) {
      return;
    }

    try {
      window.ramp.que.push(() => {
        window.ramp.spaAddAds([
          {
            type: this.leftAdType,
            selectorId: this.leftContainerId,
          },
          {
            type: this.rightAdType,
            selectorId: this.rightContainerId,
          },
        ]);
        this.adLoaded = true;
      });
    } catch (error) {
      if (this.adsEnabled) {
        console.error("Failed to load Playwire ads:", error);
      }
      this.hide();
    }
  }

  private destroyAds(): void {
    if (!window.ramp || !this.adLoaded) {
      return;
    }
    try {
      window.ramp.destroyUnits("all");
    } catch (error) {
      console.error("Failed to destroy Playwire ad:", error);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.destroyAds();
  }

  render() {
    if (!this.isVisible) {
      return html``;
    }

    return html`
      <!-- Left Gutter Ad -->
      <div
        class="hidden xl:flex fixed left-0 top-1/2 transform -translate-y-1/2 w-[160px] min-h-[600px] z-[10] pointer-events-auto items-center justify-center"
        style="margin-left: ${this.margin};"
      >
        <div
          id="${this.leftContainerId}"
          class="w-full h-full flex items-center justify-center p-2"
        ></div>
      </div>

      <!-- Right Gutter Ad -->
      <div
        class="hidden xl:flex fixed right-0 top-1/2 transform -translate-y-1/2 w-[160px] min-h-[600px] z-[10] pointer-events-auto items-center justify-center"
        style="margin-right: ${this.margin};"
      >
        <div
          id="${this.rightContainerId}"
          class="w-full h-full flex items-center justify-center p-2"
        ></div>
      </div>
    `;
  }
}

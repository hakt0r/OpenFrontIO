import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

/**
 * Google AdSense integration component
 *
 * This component creates a configurable container for Google AdSense ads
 * and properly initializes them after the component is rendered.
 */
@customElement("google-ad")
export class GoogleAdElement extends LitElement {
  // Configurable properties
  @property({ type: String }) adClient = "ca-pub-7035513310742290";
  @property({ type: String }) adSlot = "5220834834";
  @property({ type: String }) adFormat = "auto";
  @property({ type: Boolean }) fullWidthResponsive = true;
  @property({ type: String }) adTest = "off"; // "on" for testing, remove or set to "off" for production
  @property({ type: String }) darkBackgroundColor = "rgba(0, 0, 0, 0.2)";
  
  private adsEnabled = false;

  async connectedCallback() {
    super.connectedCallback();
    const config = await getServerConfigFromClient();
    this.adsEnabled = !isElectron() && config.adsEnabled();
    this.requestUpdate();
  }

  // Disable shadow DOM so AdSense can access the elements
  createRenderRoot() {
    return this;
  }

  static styles = css`
    .google-ad-container {
      margin-top: 1rem;
      border-radius: 0.5rem;
      padding: 0.5rem;
      width: 100%;
      overflow: hidden;
      transition:
        opacity 0.3s ease,
        height 0.3s ease;
    }
    .google-ad-container.hidden {
      opacity: 0;
      height: 0;
      padding: 0;
      margin: 0;
      overflow: hidden;
    }
  `;

  render() {
    if (!this.adsEnabled) {
      return html``;
    }
    
    return html`
      <div class="google-ad-container">
        <ins
          class="adsbygoogle"
          style="display:block"
          data-ad-client="${this.adClient}"
          data-ad-slot="${this.adSlot}"
          data-ad-format="${this.adFormat}"
          data-full-width-responsive="${this.fullWidthResponsive}"
          data-adtest="${this.adTest}"
        ></ins>
      </div>
    `;
  }

  firstUpdated() {
    this.initializeAds();
  }

  private async initializeAds() {
    if (!this.adsEnabled) {
      return;
    }

    try {
      // Initialize this specific ad
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense initialization error for slot:", this.adSlot, e);
    }
  }
}

// Check if running in Electron
const isElectron = () => {
  // Renderer process
  if (
    window !== undefined &&
    typeof window.process === "object" &&
    // @ts-expect-error hidden
    window.process.type === "renderer"
  ) {
    return true;
  }

  // Main process
  if (
    process !== undefined &&
    typeof process.versions === "object" &&
    !!process.versions.electron
  ) {
    return true;
  }

  // Detect the user agent when the `nodeIntegration` option is set to false
  if (
    typeof navigator === "object" &&
    typeof navigator.userAgent === "string" &&
    navigator.userAgent.indexOf("Electron") >= 0
  ) {
    return true;
  }

  return false;
};

export default GoogleAdElement;

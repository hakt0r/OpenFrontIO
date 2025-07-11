import { css } from "lit";

export const layoutStyles = css`
  /* Map Editor Layout Styles */
  .map-editor-fullscreen-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: stretch;
    justify-content: stretch;
  }

  .map-editor-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background: var(--boxBackgroundColor);
    backdrop-filter: blur(var(--blur-md));
    overflow: hidden;
    flex: 1;
  }

  .canvas-area {
    flex: 1;
    display: flex;
    position: relative;
    height: 100%;
    overflow: hidden;
  }

  .canvas-container {
    flex: 1;
    position: relative;
    background: #2a2a2a;
    overflow: hidden;
  }

  #map-canvas {
    cursor: crosshair;
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  /* Hidden file input */
  .hidden-file-input {
    display: none;
  }
`;

import { css } from "lit";

export const canvasOverlayStyles = css`
  .canvas-overlay {
    position: absolute;
    top: 15px;
    right: 15px;
    background: rgba(0, 0, 0, 0.85);
    color: #f0f0f0;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;
    pointer-events: none;
    z-index: 5;
    backdrop-filter: blur(4px);
    font-family: monospace;
    min-width: 150px;
  }

  .overlay-row {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
  }

  .overlay-row:last-child {
    margin-bottom: 0;
  }

  .overlay-label {
    margin-right: 8px;
    min-width: 16px;
  }

  .overlay-value {
    font-weight: bold;
    color: var(--primaryColor, #4a90e2);
  }

  .overlay-divider {
    height: 1px;
    background: #444;
    margin: 8px 0;
  }
`;

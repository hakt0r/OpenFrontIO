import { css } from "lit";

export const sidebarStyles = css`
  /* Map Editor Left Panel Styles */
  .left-brush-panel {
    width: 240px;
    background: #1a1a1a;
    border-right: 1px solid #333;
    display: flex;
    flex-direction: column;
    padding: 12px;
    gap: 12px;
    overflow-y: auto;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
    z-index: 10;
  }

  .brush-panel-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .brush-panel-title {
    font-size: 11px;
    font-weight: 600;
    color: #bbb;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
    padding-bottom: 3px;
    border-bottom: 1px solid #333;
  }

  .brush-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    width: 100%;
  }

  .tool-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .brush-size-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .brush-size-slider {
    width: 100%;
    -webkit-appearance: none;
    height: 4px;
    border-radius: 2px;
    background: #333;
    outline: none;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .brush-size-slider:hover {
    opacity: 1;
  }

  .brush-size-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--primaryColor);
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }

  .brush-size-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
  }

  .brush-size-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--primaryColor);
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .brush-size-display {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #ccc;
  }

  .brush-size-value {
    background: #333;
    padding: 3px 6px;
    border-radius: 3px;
    color: var(--primaryColor);
    font-weight: 600;
    min-width: 24px;
    text-align: center;
    font-size: 11px;
  }
`;

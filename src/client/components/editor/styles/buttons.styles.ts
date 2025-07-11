import { css } from "lit";

export const buttonStyles = css`
  /* Map Editor Button Styles - Compact and Professional */
  .map-editor-button {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 16px;
    padding: 2px;
    min-width: 32px;
    min-height: 32px;
    color: #ccc;
  }

  .map-editor-button:hover {
    border-color: #666;
    background: #333;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .map-editor-button.active {
    border-color: var(--primaryColor);
    background: rgba(37, 99, 235, 0.15);
    color: var(--primaryColor);
    box-shadow: 0 0 0 1px var(--primaryColor);
  }

  .map-editor-button.active:hover {
    border-color: var(--primaryColorHover);
    background: rgba(29, 78, 216, 0.2);
  }

  /* Brush Grid Buttons */
  .e-button {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 18px;
    padding: 4px;
    min-height: 40px;
  }

  .e-button:hover {
    border-color: #666;
    background: #333;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .e-button.active {
    border-color: var(--primaryColor);
    background: rgba(37, 99, 235, 0.15);
    box-shadow: 0 0 0 1px var(--primaryColor);
  }

  .e-button.active:hover {
    border-color: var(--primaryColorHover);
    background: rgba(29, 78, 216, 0.2);
  }

  /* Tool Grid Buttons */
  .tool-button {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 16px;
    padding: 2px;
    min-height: 40px;
  }

  .tool-button:hover {
    border-color: #666;
    background: #333;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .tool-button.active {
    border-color: var(--primaryColor);
    background: rgba(37, 99, 235, 0.15);
    box-shadow: 0 0 0 1px var(--primaryColor);
  }

  .tool-button.active:hover {
    border-color: var(--primaryColorHover);
    background: rgba(29, 78, 216, 0.2);
  }
`;

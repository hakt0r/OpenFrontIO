import { css } from "lit";

export const toolbarStyles = css`
  /* Map Editor Toolbar Styles */
  .map-editor-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 8px 16px;
    background: #1e1e1e;
    border-bottom: 1px solid #333;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    z-index: 15;
    align-items: center;
  }

  .map-editor-toolbar.bottom {
    border-bottom: none;
    border-top: 1px solid #333;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .toolbar-group label {
    font-weight: 500;
    color: #f0f0f0;
    white-space: nowrap;
    margin-right: 4px;
    font-size: 12px;
  }

  .vertical-separator {
    height: 24px;
    width: 1px;
    background: #333;
    margin: 0 6px;
  }

  .control-display {
    min-width: 32px;
    text-align: center;
    font-weight: 600;
    color: var(--primaryColor);
    background: #333;
    padding: 4px 8px;
    border-radius: 3px;
    border: 1px solid #444;
    font-size: 12px;
  }

  /* Heightmap toolbar specific styles */
  .heightmap-toolbar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px;
    background: #1e1e1e;
    border-top: 1px solid #333;
    box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.4);
  }

  .heightmap-toolbar-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .heightmap-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    width: 100%;
  }

  .heightmap-control-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: #ccc;
    min-width: 120px;
  }

  /* Spacer for flexible layouts */
  .flex-spacer {
    flex: 1;
  }

  /* Full width terrain slider */
  .terrain-slider-row {
    width: 100%;
  }
`;

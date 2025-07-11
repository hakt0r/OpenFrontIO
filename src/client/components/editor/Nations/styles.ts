import { css } from "lit";

export const nationsPanelStyles = css`
  .nations-panel {
    width: 260px;
    background: #1a1a1a;
    border-left: 1px solid #333;
    display: flex;
    flex-direction: column;
    padding: 12px;
    gap: 12px;
    overflow-y: auto;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
    z-index: 10;
    max-height: 100vh;
  }

  .nations-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    border-bottom: 1px solid #333;
  }

  .nations-panel-title {
    font-size: 12px;
    font-weight: 600;
    color: #bbb;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .nations-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #666;
    text-align: center;
    gap: 8px;
  }

  .empty-icon {
    font-size: 32px;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 14px;
    font-weight: 500;
    color: #888;
  }

  .empty-subtext {
    font-size: 11px;
    color: #666;
    line-height: 1.4;
  }

  .nation-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px;
    background: #2a2a2a;
    border-radius: 6px;
    border: 1px solid #333;
    transition: all 0.2s ease;
  }

  .nation-item:hover {
    background: #333;
    border-color: #444;
  }

  .nation-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .nation-name {
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 2px;
  }

  .nation-details {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .nation-flag,
  .nation-strength {
    font-size: 10px;
    color: #aaa;
    background: #333;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .nation-coords {
    font-size: 10px;
    color: #666;
    font-family: monospace;
  }

  .nation-actions {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .nation-action-btn {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    background: #333;
    color: #ccc;
  }

  .nation-action-btn:hover {
    transform: scale(1.1);
    background: #444;
  }

  .zoom-btn:hover {
    background: #2563eb;
    color: white;
  }

  .edit-btn:hover {
    background: #059669;
    color: white;
  }

  .delete-btn:hover {
    background: #dc2626;
    color: white;
  }

  .nation-action-btn:active {
    transform: scale(0.95);
  }

  /* Scrollbar styling */
  .nations-list::-webkit-scrollbar {
    width: 6px;
  }

  .nations-list::-webkit-scrollbar-track {
    background: #1a1a1a;
  }

  .nations-list::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 3px;
  }

  .nations-list::-webkit-scrollbar-thumb:hover {
    background: #444;
  }
`;

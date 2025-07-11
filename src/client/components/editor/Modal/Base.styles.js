import { css } from "lit";

export const baseModalStyles = css`
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .modal-content {
    background: #23232382;
    backdrop-filter: blur(8px);
    border-radius: 8px;
    padding: 0;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  .modal-content.large {
    max-width: 600px;
    max-height: 80vh;
  }

  .modal-header {
    font-size: 18px;
    font-weight: bold;
    background: #000000a1;
    text-align: center;
    color: #fff;
    padding: 16px 24px;
    margin: 0;
  }

  .modal-body {
    color: #fff;
    padding: 24px;
  }

  .modal-body.scrollable {
    max-height: 60vh;
    overflow-y: auto;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    margin-bottom: 4px;
    font-weight: 500;
    color: #f0f0f0;
    font-size: 14px;
  }

  .form-group input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #666;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
    background-color: #fff;
    color: #000;
  }

  .modal-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .error-message {
    color: #ff6b6b;
    font-size: 14px;
    margin-top: 8px;
    padding: 8px;
    background: rgba(255, 107, 107, 0.1);
    border-radius: 4px;
    border: 1px solid #ff6b6b;
  }

  /* Modal Button Styles */
  .modal-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--primaryColor, #2563eb);
    border: 1px solid var(--primaryColor, #2563eb);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 14px;
    font-weight: 500;
    padding: 8px 16px;
    min-height: 36px;
    color: white;
    text-decoration: none;
    outline: none;
  }

  .modal-button:hover {
    background: var(--primaryColorHover, #1d4ed8);
    border-color: var(--primaryColorHover, #1d4ed8);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .modal-button:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .modal-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .modal-button.secondary {
    background: #374151;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  .modal-button.secondary:hover {
    background: #4b5563;
    border-color: #6b7280;
  }
`;

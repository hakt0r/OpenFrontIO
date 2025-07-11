import { css } from "lit";

export const errorToastStyles = css`
  .error-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #d9534f;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    cursor: pointer;
    z-index: 10001;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    transform: translateX(100%);
    opacity: 0;
    transition: all 0.3s ease-out;
  }

  .error-toast.visible {
    transform: translateX(0);
    opacity: 1;
  }

  .error-toast:hover {
    background: #c9302c;
  }
`;

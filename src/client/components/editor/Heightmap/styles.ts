import { css } from "lit";

export const terrainSliderStyles = css`
  /* Terrain Range Slider Styles */
  .terrain-range-slider {
    width: 100%;
    height: 32px;
    position: relative;
    border: 1px solid #333;
    border-radius: 4px;
    overflow: visible;
    background: white;
    cursor: pointer;
    user-select: none;
  }

  .terrain-range-slider .range-bar {
    display: flex;
    height: 100%;
    width: 100%;
    border-radius: 3px;
    overflow: hidden;
  }

  .terrain-range-slider .range-section {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    transition: all 0.2s ease;
  }

  .range-section.ocean { background: #1e40af; }
  .range-section.shore { background: #0891b2; }
  .range-section.plains { background: #16a34a; }
  .range-section.hills { background: #ca8a04; }
  .range-section.mountain { background: #92400e; }

  .range-handles {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .range-handle {
    position: absolute;
    top: -6px;
    transform: translateX(-50%);
    width: 16px;
    height: 44px;
    background: white;
    border: 2px solid #333;
    border-radius: 4px;
    cursor: grab;
    pointer-events: all;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
    z-index: 10;
  }

  .range-handle:hover {
    transform: translateX(-50%) scale(1.1);
    box-shadow: 0 3px 6px rgba(0,0,0,0.4);
  }

  .range-handle:active {
    cursor: grabbing;
    transform: translateX(-50%) scale(1.05);
  }

  .handle-label {
    position: absolute;
    top: -24px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.9);
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: bold;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .range-handle:hover .handle-label {
    opacity: 1;
  }

  /* Color-coded handles */
  .range-handle.ocean { border-color: #1e40af; }
  .range-handle.shore { border-color: #0891b2; }
  .range-handle.plains { border-color: #16a34a; }
  .range-handle.hills { border-color: #ca8a04; }
`;

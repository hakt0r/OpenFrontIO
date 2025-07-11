import type { SidebarConfig } from "./AbstractSidebar";
import { EditorTool, BrushType } from "../types/MapEditorTypes";

export function createHeightmapSidebarConfig(): SidebarConfig {
	return {
		tools: [
			{
				id: EditorTool.Paint,
				name: "Paint",
				emoji: "🖌️",
				title: "Paint Tool",
			},
			{
				id: EditorTool.Erase,
				name: "Erase",
				emoji: "🧽",
				title: "Erase Tool",
			},
		],
		brushes: [
			{
				id: BrushType.RaiseTerrain,
				name: "Raise Terrain",
				emoji: "📈",
				title: "Raise Terrain - Softly increase terrain elevation",
			},
			{
				id: BrushType.LowerTerrain,
				name: "Lower Terrain",
				emoji: "📉",
				title: "Lower Terrain - Softly decrease terrain elevation",
			},
			{
				id: BrushType.GaussianBlur,
				name: "Smooth",
				emoji: "🌪️",
				title: "Smooth Terrain - Blur terrain to smooth transitions",
			},
			{
				id: "exit_heightmap",
				name: "Exit Heightmap",
				emoji: "✅",
				title: "Exit Heightmap Mode - Return to regular terrain editing",
			},
		],
		controls: [
			{
				id: "brushSize",
				name: "Brush Size",
				type: "range" as const,
				value: 5,
				min: 1,
				max: 20,
				step: 1,
				helpText: "Mouse wheel",
			},
			{
				id: "brushMagnitude",
				name: "Brush Strength",
				type: "range" as const,
				value: 15,
				min: 1,
				max: 31,
				step: 1,
				helpText: "Ctrl+Alt+Mouse wheel",
			},
			{
				id: "maxSize",
				name: "Max Size",
				type: "range" as const,
				value: 4096,
				min: 256,
				max: 8192,
				step: 256,
				helpText: "Maximum heightmap resolution",
			},
			{
				id: "clampMin",
				name: "Clamp Min",
				type: "range" as const,
				value: 0,
				min: 0,
				max: 1,
				step: 0.01,
				helpText: "Minimum height value",
			},
			{
				id: "clampMax",
				name: "Clamp Max",
				type: "range" as const,
				value: 1,
				min: 0,
				max: 1,
				step: 0.01,
				helpText: "Maximum height value",
			},
		],
	};
}

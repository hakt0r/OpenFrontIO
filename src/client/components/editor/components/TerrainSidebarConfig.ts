import type { SidebarConfig } from "./AbstractSidebar";
import { EditorTool, type BrushType } from "../types/MapEditorTypes";
import { getBrushEmoji, getBrushName } from "../TerrainPanel/handlers";

export function createTerrainSidebarConfig(
	allBrushTypes: BrushType[],
): SidebarConfig {
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
			{
				id: EditorTool.Nation,
				name: "Nation",
				emoji: "🏴",
				title: "Nation Tool",
			},
		],
		brushes: allBrushTypes.map((brushType) => ({
			id: brushType,
			name: getBrushName(brushType),
			emoji: getBrushEmoji(brushType),
			title: getBrushName(brushType),
		})),
		controls: [
			{
				id: "brushSize",
				name: "Brush Size",
				type: "range" as const,
				value: 5,
				min: 1,
				max: 20,
				step: 1,
				helpText: "Mouse wheel to adjust",
			},
			{
				id: "brushMagnitude",
				name: "Brush Magnitude",
				type: "range" as const,
				value: 15,
				min: 1,
				max: 31,
				step: 1,
				helpText: "Ctrl+Alt+Scroll to adjust",
			},
		],
	};
}

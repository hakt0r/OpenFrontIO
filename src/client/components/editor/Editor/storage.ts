import type { MapManifest } from "../../../../core/game/TerrainMapLoader";

const DB_NAME = "MapEditorDB";
const DB_VERSION = 1;
const STORE_NAME = "maps";
const MAX_RUN_LENGTH = 255;
const COMPRESSION_CHUNK_SIZE = 8192;

interface MapSaveData {
	version: string;
	manifest: MapManifest;
	terrainData: number[];
	saveDate: string;
}

export class MapStorage {
	private db: IDBDatabase | null = null;

	async init(): Promise<void> {
		if (this.db) return;

		return new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				this.db = request.result;
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					db.createObjectStore(STORE_NAME, { keyPath: "id" });
				}
			};
		});
	}

	async saveMap(id: string, data: MapSaveData): Promise<void> {
		await this.init();
		if (!this.db) throw new Error("Database not initialized");

		return new Promise((resolve, reject) => {
			if (!this.db) throw new Error("Database not initialized");
			const transaction = this.db.transaction([STORE_NAME], "readwrite");
			const store = transaction.objectStore(STORE_NAME);

			const compressedData = {
				...data,
				terrainData: this.compressTerrainData(data.terrainData),
				compressed: true,
			};

			const request = store.put({ id, ...compressedData });
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async loadMap(id: string): Promise<MapSaveData | null> {
		await this.init();
		if (!this.db) throw new Error("Database not initialized");

		return new Promise((resolve, reject) => {
			if (!this.db) throw new Error("Database not initialized");
			const transaction = this.db.transaction([STORE_NAME], "readonly");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.get(id);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const result = request.result;
				if (!result) return resolve(null);

				if (result.compressed) {
					result.terrainData = this.decompressTerrainData(result.terrainData);
				}

				resolve(result);
			};
		});
	}

	async getAllMapIds(): Promise<string[]> {
		await this.init();
		if (!this.db) return [];

		return new Promise((resolve, reject) => {
			if (!this.db) throw new Error("Database not initialized");
			const transaction = this.db.transaction([STORE_NAME], "readonly");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.getAllKeys();

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				resolve(request.result.map((key) => key.toString()));
			};
		});
	}

	async deleteMap(id: string): Promise<void> {
		await this.init();
		if (!this.db) throw new Error("Database not initialized");

		return new Promise((resolve, reject) => {
			if (!this.db) throw new Error("Database not initialized");
			const transaction = this.db.transaction([STORE_NAME], "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.delete(id);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	private compressTerrainData(data: number[]): string {
		const compressed: number[] = [];
		let current = data[0];
		let count = 1;

		for (let i = 1; i < data.length; i++) {
			if (data[i] === current && count < MAX_RUN_LENGTH) {
				count++;
			} else {
				compressed.push(current, count);
				current = data[i];
				count = 1;
			}
		}
		compressed.push(current, count);

		let binaryString = "";

		for (let i = 0; i < compressed.length; i += COMPRESSION_CHUNK_SIZE) {
			const chunk = compressed.slice(i, i + COMPRESSION_CHUNK_SIZE);
			binaryString += String.fromCharCode(...chunk);
		}

		return btoa(binaryString);
	}

	private decompressTerrainData(compressed: string): number[] {
		try {
			const binaryString = atob(compressed);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}

			const decompressed: number[] = [];

			for (let i = 0; i < bytes.length; i += 2) {
				const value = bytes[i];
				const count = bytes[i + 1];
				for (let j = 0; j < count; j++) {
					decompressed.push(value);
				}
			}

			return decompressed;
		} catch (error) {
			console.error("Failed to decompress terrain data:", error);
			throw new Error("Corrupted map data");
		}
	}
}

import { Colord } from "colord";
import { JWK } from "jose";
import { GameConfig, GameID, TeamCountConfig } from "../Schemas";
import {
  Difficulty,
  Game,
  GameMapType,
  GameMode,
  Gold,
  Player,
  PlayerInfo,
  Team,
  TerraNullius,
  Tick,
  UnitInfo,
  UnitType,
} from "../game/Game";
import { GameMap, TileRef } from "../game/GameMap";
import { PlayerView } from "../game/GameView";
import { UserSettings } from "../game/UserSettings";

export enum GameEnv {
  Dev,
  Preprod,
  Prod,
}

export interface ServerConfig {
  turnIntervalMs(): number;
  gameCreationRate(): number;
  lobbyMaxPlayers(
    map: GameMapType,
    mode: GameMode,
    numPlayerTeams: TeamCountConfig | undefined,
  ): number;
  numWorkers(): number;
  workerIndex(gameID: GameID): number;
  workerPath(gameID: GameID): string;
  workerPort(gameID: GameID): number;
  workerPortByIndex(workerID: number): number;
  env(): GameEnv;
  adminToken(): string;
  adminHeader(): string;
  // Only available on the server
  gitCommit(): string;
  r2Bucket(): string;
  r2Endpoint(): string;
  r2AccessKey(): string;
  r2SecretKey(): string;
  otelEndpoint(): string;
  otelAuthHeader(): string;
  otelEnabled(): boolean;
  jwtAudience(): string;
  jwtIssuer(): string;
  jwkPublicKey(): Promise<JWK>;
  domain(): string;
  subdomain(): string;
  cloudflareAccountId(): string;
  cloudflareApiToken(): string;
  cloudflareConfigPath(): string;
  cloudflareCredsPath(): string;
  stripePublishableKey(): string;
  allowedFlares(): string[] | undefined;
  // Feature toggles for external services
  stripeEnabled(): boolean;
  analyticsEnabled(): boolean;
  adsEnabled(): boolean;
}

export interface NukeMagnitude {
  inner: number;
  outer: number;
}

export interface Config {
  samHittingChance(): number;
  samWarheadHittingChance(): number;
  spawnImmunityDuration(): Tick;
  serverConfig(): ServerConfig;
  gameConfig(): GameConfig;
  theme(): Theme;
  percentageTilesOwnedToWin(): number;
  numBots(): number;
  spawnNPCs(): boolean;
  isUnitDisabled(unitType: UnitType): boolean;
  bots(): number;
  infiniteGold(): boolean;
  infiniteTroops(): boolean;
  instantBuild(): boolean;
  numSpawnPhaseTurns(): number;
  userSettings(): UserSettings;
  playerTeams(): TeamCountConfig;

  startManpower(playerInfo: PlayerInfo): number;
  populationIncreaseRate(player: Player | PlayerView): number;
  goldAdditionRate(player: Player | PlayerView): Gold;
  troopAdjustmentRate(player: Player): number;
  attackTilesPerTick(
    attckTroops: number,
    attacker: Player,
    defender: Player | TerraNullius,
    numAdjacentTilesWithEnemy: number,
  ): number;
  attackLogic(
    gm: Game,
    attackTroops: number,
    attacker: Player,
    defender: Player | TerraNullius,
    tileToConquer: TileRef,
  ): {
    attackerTroopLoss: number;
    defenderTroopLoss: number;
    tilesPerTickUsed: number;
  };
  attackAmount(attacker: Player, defender: Player | TerraNullius): number;
  radiusPortSpawn(): number;
  // When computing likelihood of trading for any given port, the X closest port
  // are twice more likely to be selected. X is determined below.
  proximityBonusPortsNb(totalPorts: number): number;
  maxPopulation(player: Player | PlayerView): number;
  cityPopulationIncrease(): number;
  boatAttackAmount(attacker: Player, defender: Player | TerraNullius): number;
  shellLifetime(): number;
  boatMaxNumber(): number;
  allianceDuration(): Tick;
  allianceRequestCooldown(): Tick;
  temporaryEmbargoDuration(): Tick;
  targetDuration(): Tick;
  targetCooldown(): Tick;
  emojiMessageCooldown(): Tick;
  emojiMessageDuration(): Tick;
  donateCooldown(): Tick;
  defaultDonationAmount(sender: Player): number;
  unitInfo(type: UnitType): UnitInfo;
  tradeShipGold(dist: number, numPorts: number): Gold;
  tradeShipSpawnRate(numberOfPorts: number): number;
  trainGold(): Gold;
  trainSpawnRate(numberOfStations: number): number;
  trainStationMinRange(): number;
  trainStationMaxRange(): number;
  railroadMaxSize(): number;
  safeFromPiratesCooldownMax(): number;
  defensePostRange(): number;
  SAMCooldown(): number;
  SiloCooldown(): number;
  defensePostDefenseBonus(): number;
  defensePostSpeedBonus(): number;
  falloutDefenseModifier(percentOfFallout: number): number;
  difficultyModifier(difficulty: Difficulty): number;
  warshipPatrolRange(): number;
  warshipShellAttackRate(): number;
  warshipTargettingRange(): number;
  defensePostShellAttackRate(): number;
  defensePostTargettingRange(): number;
  // 0-1
  traitorDefenseDebuff(): number;
  traitorDuration(): number;
  nukeMagnitudes(unitType: UnitType): NukeMagnitude;
  defaultNukeSpeed(): number;
  defaultNukeTargetableRange(): number;
  defaultSamRange(): number;
  nukeDeathFactor(humans: number, tilesOwned: number): number;
  structureMinDist(): number;
  isReplay(): boolean;
  allianceExtensionPromptOffset(): number;
}

export interface Theme {
  teamColor(team: Team): Colord;
  territoryColor(playerInfo: PlayerView): Colord;
  specialBuildingColor(playerInfo: PlayerView): Colord;
  railroadColor(playerInfo: PlayerView): Colord;
  borderColor(playerInfo: PlayerView): Colord;
  defendedBorderColors(playerInfo: PlayerView): { light: Colord; dark: Colord };
  focusedBorderColor(): Colord;
  terrainColor(gm: GameMap, tile: TileRef): Colord;
  backgroundColor(): Colord;
  falloutColor(): Colord;
  font(): string;
  textColor(playerInfo: PlayerView): string;
  // unit color for alternate view
  selfColor(): Colord;
  allyColor(): Colord;
  enemyColor(): Colord;
  spawnHighlightColor(): Colord;
  // Terrain color accessors for editor
  getWaterColor(): Colord;
  getShoreColor(): Colord;
  getPlainsBaseColor(): Colord;
  getHighlandBaseColor(): Colord;
  getMountainBaseColor(): Colord;

  // Editor specific colors
  editor: {
    background: Colord;
    text: Colord;
    textAgainst: Colord;
    border: Colord;
    primary: Colord;
    primaryHover: Colord;
    secondary: Colord;
    secondaryHover: Colord;
    componentBackground: Colord;
    inputBackground: Colord;
    inputText: Colord;
    buttonActiveBackground: Colord;
    buttonActiveText: Colord;
    errorBackground: Colord;
    errorText: Colord;
    errorBackgroundHover: Colord;
  };
}

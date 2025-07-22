import { UnitInfo, UnitType } from "../game/Game";
import { UserSettings } from "../game/UserSettings";
import { GameConfig } from "../Schemas";
import { GameEnv, ServerConfig } from "./Config";
import { DefaultConfig, DefaultServerConfig } from "./DefaultConfig";

export class DevServerConfig extends DefaultServerConfig {
  adminToken(): string {
    return "WARNING_DEV_ADMIN_KEY_DO_NOT_USE_IN_PRODUCTION";
  }

  env(): GameEnv {
    return GameEnv.Dev;
  }

  gameCreationRate(): number {
    return 5 * 1000;
  }

  samWarheadHittingChance(): number {
    return 1;
  }

  samHittingChance(): number {
    return 1;
  }

  numWorkers(): number {
    return 2;
  }
  jwtAudience(): string {
    return "localhost";
  }
  gitCommit(): string {
    return "DEV";
  }

  domain(): string {
    return "localhost";
  }

  subdomain(): string {
    return "";
  }

  // Feature toggles - disabled by default in development to prevent annoying errors
  stripeEnabled(): boolean {
    // Client-side: disabled by default in dev
    if (typeof process === 'undefined') return false;
    return process.env.ENABLE_STRIPE === "true";
  }
  analyticsEnabled(): boolean {
    // Client-side: disabled by default in dev
    if (typeof process === 'undefined') return false;
    return process.env.ENABLE_ANALYTICS === "true";
  }
  adsEnabled(): boolean {
    // Client-side: disabled by default in dev
    if (typeof process === 'undefined') return false;
    return process.env.ENABLE_ADS === "true";
  }
}

export class DevConfig extends DefaultConfig {
  constructor(
    sc: ServerConfig,
    gc: GameConfig,
    us: UserSettings | null,
    isReplay: boolean,
  ) {
    super(sc, gc, us, isReplay);
  }

  // numSpawnPhaseTurns(): number {
  //   return this.gameConfig().gameType == GameType.Singleplayer ? 70 : 100;
  //   // return 100
  // }

  unitInfo(type: UnitType): UnitInfo {
    const info = super.unitInfo(type);
    const oldCost = info.cost;
    // info.cost = (p: Player) => oldCost(p) / 1000000000;
    return info;
  }

  // tradeShipSpawnRate(): number {
  //   return 10;
  // }

  // percentageTilesOwnedToWin(): number {
  //     return 1
  // }

  // populationIncreaseRate(player: Player): number {
  //     return this.maxPopulation(player)
  // }

  // boatMaxDistance(): number {
  //     return 5000
  // }

  //   numBots(): number {
  //     return 0;
  //   }
  //   spawnNPCs(): boolean {
  //     return false;
  //   }
}

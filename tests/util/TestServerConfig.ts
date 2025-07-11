import { JWK } from "jose";
import { GameEnv, ServerConfig } from "../../src/core/configuration/Config";
import { GameMapType, GameMode } from "../../src/core/game/Game";
import { GameID, TeamCountConfig } from "../../src/core/Schemas";

export class TestServerConfig implements ServerConfig {
  allowedFlares(): string[] | undefined {
    throw new Error("Method not implemented.");
  }
  stripePublishableKey(): string {
    throw new Error("Method not implemented.");
  }
  cloudflareConfigPath(): string {
    throw new Error("Method not implemented.");
  }
  cloudflareCredsPath(): string {
    throw new Error("Method not implemented.");
  }
  domain(): string {
    throw new Error("Method not implemented.");
  }
  subdomain(): string {
    throw new Error("Method not implemented.");
  }
  cloudflareAccountId(): string {
    throw new Error("Method not implemented.");
  }
  cloudflareApiToken(): string {
    throw new Error("Method not implemented.");
  }
  jwtAudience(): string {
    throw new Error("Method not implemented.");
  }
  jwtIssuer(): string {
    throw new Error("Method not implemented.");
  }
  jwkPublicKey(): Promise<JWK> {
    throw new Error("Method not implemented.");
  }
  otelEnabled(): boolean {
    throw new Error("Method not implemented.");
  }
  otelEndpoint(): string {
    throw new Error("Method not implemented.");
  }
  otelAuthHeader(): string {
    throw new Error("Method not implemented.");
  }
  turnIntervalMs(): number {
    throw new Error("Method not implemented.");
  }
  gameCreationRate(): number {
    throw new Error("Method not implemented.");
  }
  lobbyMaxPlayers(
    map: GameMapType,
    mode: GameMode,
    numPlayerTeams: TeamCountConfig | undefined,
  ): number {
    throw new Error("Method not implemented.");
  }
  numWorkers(): number {
    throw new Error("Method not implemented.");
  }
  workerIndex(gameID: GameID): number {
    throw new Error("Method not implemented.");
  }
  workerPath(gameID: GameID): string {
    throw new Error("Method not implemented.");
  }
  workerPort(gameID: GameID): number {
    throw new Error("Method not implemented.");
  }
  workerPortByIndex(workerID: number): number {
    throw new Error("Method not implemented.");
  }
  env(): GameEnv {
    throw new Error("Method not implemented.");
  }
  adminToken(): string {
    throw new Error("Method not implemented.");
  }
  adminHeader(): string {
    throw new Error("Method not implemented.");
  }
  gitCommit(): string {
    throw new Error("Method not implemented.");
  }
  r2Bucket(): string {
    throw new Error("Method not implemented.");
  }
  r2Endpoint(): string {
    throw new Error("Method not implemented.");
  }
  r2AccessKey(): string {
    throw new Error("Method not implemented.");
  }
  r2SecretKey(): string {
    throw new Error("Method not implemented.");
  }
  // Feature toggle methods - disabled for tests
  stripeEnabled(): boolean {
    return false;
  }
  analyticsEnabled(): boolean {
    return false;
  }
  adsEnabled(): boolean {
    return false;
  }
} 
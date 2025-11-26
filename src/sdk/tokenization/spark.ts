import { Web3Sdk } from "..";

/**
 * TODO:
 * - Replace with actual implementation
 * - provide correct inputs
 * - define output types for all methods
 * - integrate API request if need database calls, e.g. get token policies from database
 */

export class TokenizationSpark {
  private readonly sdk: Web3Sdk;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    {
      this.sdk = sdk;
    }
  }

  async createToken({}): Promise<string> {
    return "";
  }

  async mintTokens({}): Promise<string> {
    return "";
  }

  async getTokenBalance(address?: string) {}

  async getTokenMetadata(): Promise<{}> {
    return {};
  }

  async transferTokens({}): Promise<string> {
    return "";
  }

  async batchTransferTokens({}): Promise<{}> {
    return {};
  }

  async freezeTokens(address: string): Promise<{}> {
    return {};
  }

  async unfreezeTokens(address: string): Promise<{}> {
    return {};
  }

  async burnTokens(quantity: number): Promise<string> {
    return "";
  }
}

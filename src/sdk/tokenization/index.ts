import { Web3Sdk } from "..";
import { TokenizationSpark } from "./spark";

export class Tokenization {
  private readonly sdk: Web3Sdk;
  spark: TokenizationSpark;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    {
      this.sdk = sdk;
      this.spark = new TokenizationSpark({ sdk: this.sdk });
    }
  }
}

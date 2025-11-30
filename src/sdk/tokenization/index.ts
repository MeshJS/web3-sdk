import { Web3Sdk } from "..";
import { TokenizationSpark } from "./spark";
import { TokenizationCardano } from "./cardano";

export class Tokenization {
  private readonly sdk: Web3Sdk;
  spark: TokenizationSpark;
  cardano: TokenizationCardano;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    this.sdk = sdk;
    this.spark = new TokenizationSpark({ sdk: this.sdk });
    this.cardano = new TokenizationCardano({ sdk: this.sdk });
  }
}

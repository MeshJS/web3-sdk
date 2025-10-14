import { UserSocialData } from "../user/social-data";
import { IFetcher, ISubmitter } from "@meshsdk/common";

export type WindowWalletReq = {
  networkId: 0 | 1;
  projectId?: string;
  appUrl?: string;
  directTo?: UserControlledWalletDirectTo;
};

export type WindowWalletRes = {
  success: boolean;
  pubKeyHash: string;
  stakeCredentialHash: string;
  user: UserSocialData | undefined;
};

export type UserControlledWalletDirectTo =
  | "google"
  | "twitter"
  | "discord"
  | "apple";

export type CreateWalletOptions = {
  networkId: 0 | 1;
  fetcher?: IFetcher | undefined;
  submitter?: ISubmitter;
  appUrl?: string;
  projectId?: string;
  user?: UserSocialData;
};

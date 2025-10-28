import { UserSocialData } from "../user/social-data";
import { IFetcher, ISubmitter } from "@meshsdk/common";

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

import { CreateMeshWalletOptions } from "@meshsdk/wallet";
import { UserSocialData } from "../user/social-data";

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

export type CreateWalletOptions = CreateMeshWalletOptions & {
  appUrl?: string;
  projectId?: string;
  user?: UserSocialData;
};

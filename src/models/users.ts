export type MUser = {
  id: string;
  username: string;
  passKey: any;
  counter?: any;
  // This for accumulating fees (from sponsor tx for now)
  // When usage grow, can separate this to another table
  feeAccrued: string;
};

import { IAssetClawbackTx } from '@algosigner/common/interfaces/axfer_clawback';
import { BaseValidatedTxnWrap } from './baseValidatedTxnWrap';

///
// Base implementation of the transactions type interface, for use in the export wrapper class below.
///
class AssetClawbackTx implements IAssetClawbackTx {
  type: string = undefined;
  assetIndex: number = undefined;
  amount: BigInt = BigInt(0);
  from: string = undefined;
  to: string = undefined;
  closeRemainderTo?: string = null;
  fee?: number = 0;
  firstRound: number = undefined;
  lastRound: number = undefined;
  note?: string = null;
  genesisID: string = undefined;
  genesisHash: any = undefined;
  group?: string = null;
  lease?: any = null;
  reKeyTo?: any = null;
  assetRevocationTarget: string = undefined;
  flatFee?: any = null;
  name?: string = null;
  tag?: string = null;
}

///
// Mapping, validation and error checking for axfer clawback transactions prior to sign.
///
export class AssetClawbackTransaction extends BaseValidatedTxnWrap {
  txDerivedTypeText: string = 'Asset Clawback';
  constructor(params: IAssetClawbackTx) {
    super(params, AssetClawbackTx);
  }
}

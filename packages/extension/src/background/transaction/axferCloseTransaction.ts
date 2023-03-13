import { RequestError } from '@algosigner/common/errors';
import { IAssetCloseTx } from '@algosigner/common/interfaces/axfer_close';
import { BaseValidatedTxnWrap } from './baseValidatedTxnWrap';

///
// Base implementation of the transactions type interface, for use in the export wrapper class below.
///
class AssetCloseTx implements IAssetCloseTx {
  type: string = undefined;
  assetIndex: number = undefined;
  from: string = undefined;
  fee?: number = 0;
  to: any = undefined;
  closeRemainderTo: string = undefined;
  firstRound: number = undefined;
  lastRound: number = undefined;
  note?: string = null;
  genesisID: string = undefined;
  genesisHash: any = undefined;
  group?: string = null;
  lease?: any = null;
  reKeyTo?: any = null;
  amount?: BigInt = null;
  flatFee?: any = null;
  name?: string = null;
  tag?: string = null;
}

///
// Mapping, validation and error checking for axfer accept transactions prior to sign.
///
export class AssetCloseTransaction extends BaseValidatedTxnWrap {
  txDerivedTypeText: string = 'Asset Opt-Out';
  constructor(params: IAssetCloseTx) {
    super(params, AssetCloseTx);
    // Additional check to verify that address from and to are the same
    if (this.transaction && this.transaction['to'] !== this.transaction['from']) {
      throw RequestError.InvalidTransactionStructure(
        `Creation of AssetCloseTx has non identical to and from fields.`
      );
    }
  }
}

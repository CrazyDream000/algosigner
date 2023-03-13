import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useEffect, useRef, useContext } from 'preact/hooks';
import { JsonRpcMethod } from '@algosigner/common/messaging/types';

import { sendMessage } from 'services/Messaging';
import { StoreContext } from 'services/StoreContext';

import TxAcfg from 'components/TransactionDetail/TxAcfg';
import TxPay from 'components/TransactionDetail/TxPay';
import TxKeyreg from 'components/TransactionDetail/TxKeyreg';
import TxAxfer from 'components/TransactionDetail/TxAxfer';
import TxAfrz from 'components/TransactionDetail/TxAfrz';
import TxAppl from 'components/TransactionDetail/TxAppl';

const BACKGROUND_REFRESH_TIMER: number = 10000;
const INNER_TXN_DESCRIPTIONS = {
  axfer: 'Asset Transfer',
  pay: 'Payment',
  afrz: 'Asset Freeze',
  keyreg: 'Key Registration',
  acfg: 'Asset Config',
  appl: 'Application',
};

const TransactionsList: FunctionalComponent = (props: any) => {
  const store: any = useContext(StoreContext);
  const { address, ledger } = props;

  const [date, setDate] = useState<any>(new Date());
  const [results, setResults] = useState<any>([]);
  const [pending, setPending] = useState<any>([]);
  const [isLoading, setLoading] = useState<any>(true);
  const [showTx, setShowTx] = useState<any>(null);
  const [nextToken, setNextToken] = useState<any>(null);
  const resultsRef = useRef([]);
  const pendingRef = useRef([]);

  const fetchApi = async () => {
    setLoading(true);
    const params = {
      'ledger': ledger,
      'address': address,
      'next-token': nextToken,
      'limit': 20,
    };
    sendMessage(JsonRpcMethod.Transactions, params, function (response) {
      setLoading(false);
      // If there are already transactions, just append the new ones
      if (results.length > 0) {
        setResults(results.concat(response.transactions));
      } else {
        resultsRef.current = response.transactions;
        pendingRef.current = response.pending;
        setResults(resultsRef.current);
        setPending(pendingRef.current);
        if (pendingRef.current && pendingRef.current.length) {
          setTimeout(backgroundFetch, BACKGROUND_REFRESH_TIMER);
        }
      }
      const nextToken = response['next-token'] || null;
      setNextToken(nextToken);
    });
  };

  const backgroundFetch = async () => {
    setLoading(true);
    const params = {
      ledger: ledger,
      address: address,
      limit: resultsRef.current.length + pendingRef.current.length,
    };
    sendMessage(JsonRpcMethod.Transactions, params, function (response) {
      setLoading(false);
      setDate(new Date());
      setResults(response.transactions);
      setPending(response.pending);
      // If there are still pending tx after the update, we request another background fetch
      if (response.pending && response.pending.length) {
        setTimeout(backgroundFetch, BACKGROUND_REFRESH_TIMER);
      }

      if (response['next-token']) setNextToken(response['next-token']);
      else setNextToken(null);
    });
  };

  const handleClick = (tx) => {
    switch (tx['tx-type']) {
      case 'pay':
        setShowTx(html`<${TxPay} tx=${tx} ledger=${ledger} />`);
        break;
      case 'keyreg':
        setShowTx(html`<${TxKeyreg} tx=${tx} ledger=${ledger} />`);
        break;
      case 'acfg':
        setShowTx(html`<${TxAcfg} tx=${tx} ledger=${ledger} />`);
        break;
      case 'axfer':
        setShowTx(html`<${TxAxfer} tx=${tx} ledger=${ledger} />`);
        break;
      case 'afrz':
        setShowTx(html`<${TxAfrz} tx=${tx} ledger=${ledger} />`);
        break;
      case 'appl':
        setShowTx(html`<${TxAppl} tx=${tx} ledger=${ledger} />`);
        break;
    }
  };

  useEffect(() => {
    setDate(new Date());
    fetchApi();
  }, []);

  if (!results) return null;

  const loadMore = () => {
    fetchApi();
  };

  const getTxInfo = (tx, date): any => {
    function getTime(date, roundTime) {
      const MINUTESTHRESHOLD = 60000;
      const HOURSTHRESHOLD = 3600000;

      const roundDate = new Date(roundTime * 1000);
      const diffTime = date - roundDate.getTime();

      if (diffTime < 86400000) {
        let time, label;
        if (diffTime < MINUTESTHRESHOLD) {
          time = diffTime / 1000;
          label = 'sec';
        } else if (diffTime < HOURSTHRESHOLD) {
          time = diffTime / MINUTESTHRESHOLD;
          label = 'min';
        } else {
          time = diffTime / HOURSTHRESHOLD;
          label = 'hour';
        }
        time = Math.floor(time);
        if (time > 1) return time + ' ' + label + 's ago';
        else return time + ' ' + label + ' ago';
      } else {
        return roundDate.toDateString();
      }
    }

    const id = tx.id;
    const time = getTime(date, tx['round-time']);
    let title, subtitle, info;

    switch (tx['tx-type']) {
      case 'pay':
        info = tx['payment-transaction'].amount / 1e6 + ' Algos';
        if (tx.sender === address) {
          subtitle = 'Payment To';
          title = tx['payment-transaction'].receiver;
        } else {
          subtitle = 'Payment From';
          title = tx.sender;
        }
        break;
      case 'keyreg':
        title = 'Key registration';
        break;
      case 'acfg':
        subtitle = 'Asset config';
        title = tx['asset-config-transaction'].params.name;
        break;
      case 'axfer':
        info = tx['asset-transfer-transaction']['amount'];
        store.getAssetDetails(ledger, address, (assets) => {
          const id = tx['asset-transfer-transaction']['asset-id'];

          // Check if the asset has not been deleted before getting info about it
          if (assets[id]) {
            const dec = assets[id].decimals || 0;
            const amount = info / Math.pow(10, dec);
            info = `${amount} ${assets[id].unitName}`;
          }
        });
        // TODO Close-to txs
        // Clawback if there is a sender in the transfer object
        if (tx['asset-transfer-transaction'].sender) {
          if (tx['asset-transfer-transaction'].receiver === address) {
            subtitle = 'ASA From (clawback)';
            title = tx['asset-transfer-transaction']['sender'];
          } else {
            subtitle = 'ASA To (clawback)';
            title = tx['asset-transfer-transaction']['receiver'];
          }
        } else {
          if (tx['asset-transfer-transaction'].receiver === address) {
            subtitle = 'ASA From';
            title = tx['sender'];
          } else {
            subtitle = 'ASA To';
            title = tx['asset-transfer-transaction']['receiver'];
          }
        }
        break;
      case 'afrz':
        title = tx['asset-freeze-transaction']['asset-id'];
        if (tx['asset-freeze-transaction']['new-freeze-status']) {
          subtitle = 'Asset freezed';
        } else {
          subtitle = 'Asset unfreezed';
        }
        break;
      case 'appl':
        if ('application-id' in tx['application-transaction']) {
          subtitle = tx['application-transaction']['application-id'] || 'application';
          info = tx['application-transaction']['on-completion'];
          title = 'Application';
        } else {
          subtitle = 'appl';
          title = 'Application Transaction';
        }
        break;
    }

    return {
      title,
      subtitle,
      info,
      id,
      time,
    };
  };

  const getTxTemplate = (tx, date) => {
    const { title, subtitle, info, id, time } = getTxInfo(tx, date);
    return html`
      <div style="display: flex; justify-content: space-between;" data-transaction-id="${id}">
        <div style="max-width: 60%; white-space: nowrap;">
          <h2 class="subtitle is-size-7 is-uppercase has-text-grey-light">${subtitle}</h2>
          <h1 style="text-overflow: ellipsis; overflow: hidden;" class="title is-size-6">
            ${title}
          </h1>
        </div>
        <div class="has-text-right">
          <h2 class="subtitle is-size-7 has-text-grey-light is-uppercase">${time}</h2>
          <h1 class="title is-size-6">${info}</h1>
        </div>
      </div>
      ${tx['inner-txns'] &&
      html`
        <span class="has-text-grey-light is-size-7 is-uppercase pt-2">Inner Transaction(s):</span>
        <div class="is-size-7 pl-1">
          ${tx['inner-txns'].map(
            (inner: any) => {
              const innerTxInfo = getTxInfo(inner, date);
              return html`
                <div class="is-flex is-justify-content-space-between">
                  <i class="fas fa-angle-double-right mr-1" aria-hidden="true" />
                  <span class="is-uppercase">${INNER_TXN_DESCRIPTIONS[inner['tx-type']]}</span>
                  <div class="has-text-right is-flex-grow-1">${innerTxInfo.info}</div>
                </div>
              `;}
          )}
        </div>
      `}
    `;
  };

  const getPendingTxInfo = (tx) => {
    let title, subtitle, info;
    switch (tx['type']) {
      case 'pay':
        info = tx.amount / 1e6 + ' Algos';
        if (tx.sender === address) {
          subtitle = 'Pending Payment to';
          title = tx.receiver;
        } else {
          subtitle = 'Pending Payment from';
          title = tx.sender;
        }
        break;
      case 'keyreg':
        subtitle = 'Pending transaction';
        title = 'Key Registration';
        break;
      case 'acfg':
        subtitle = 'Pending Asset Config Transaction';
        title = tx.id;
        break;
      case 'axfer':
        info = tx.assetName ? `${tx.amount} ${tx.assetName}` : null;
        // Clawback if there is a sender in the transfer object
        if (tx.assetSender) {
          if (tx.receiver === address) {
            subtitle = 'Pending Asset Clawback From';
            title = tx.assetSender;
          } else {
            subtitle = 'Pending Asset Clawback To';
            title = tx.receiver;
          }
        } else {
          if (tx.receiver === address) {
            subtitle = 'Pending Asset Transfer From';
            title = tx.sender;
          } else {
            subtitle = 'Pending Asset Transfer To';
            title = tx.receiver;
          }
        }
        break;
      case 'afrz':
        subtitle = 'Pending Asset Freeze Transaction';
        title = tx.assetName;
        break;
      case 'appl':
        subtitle = 'Pending Application Transaction';
        title = tx.id;
        break;
    }

    return html`
      <div style="display: flex; justify-content: space-between;">
        <div style="max-width: 60%; white-space: nowrap;">
          <h2 class="subtitle is-size-7 is-uppercase has-text-grey-light">
            <i>${subtitle}</i>
          </h2>
          <h1
            style="text-overflow: ellipsis; overflow: hidden;"
            class="title is-size-6 has-text-grey"
          >
            <i>${title}</i>
          </h1>
        </div>
        ${info &&
        html`
          <div class="has-text-right" style="margin-top: 17px;">
            <h1 class="title is-size-6 has-text-grey">
              <i>${info}</i>
            </h1>
          </div>
        `}
      </div>
    `;
  };

  return html`
    <div class="py-2">
      <span class="px-4 has-text-weight-bold is-size-5">Transactions</span>
      ${pending.map(
        (tx: any) => html`
          <div class="py-3 px-4" style="border-top: 1px solid rgba(138, 159, 168, 0.2);">
            ${getPendingTxInfo(tx)}
          </div>
        `
      )}
      ${results &&
      results.map(
        (tx: any) => html`
          <div
            class="py-3 px-4"
            style="border-top: 1px solid rgba(138, 159, 168, 0.2); cursor: pointer;"
            onClick=${() => handleClick(tx)}
          >
            ${getTxTemplate(tx, date)}
          </div>
        `
      )}
      ${!isLoading &&
      nextToken &&
      html`
        <div
          class="py-3 px-4 has-text-centered"
          style="border-top: 1px solid rgba(138, 159, 168, 0.2);"
        >
          <a onClick=${loadMore}> Load more transactions </a>
        </div>
      `}
      ${isLoading &&
      html`
        <div style="padding: 10px 0;">
          <span class="loader" style="position: relative; left: calc(50% - 0.5em);"></span>
        </div>
      `}
    </div>

    <div class=${`modal ${showTx ? 'is-active' : ''}`}>
      <div class="modal-background" onClick=${() => setShowTx(null)} />
      <div class="modal-content">${showTx}</div>
      <button class="modal-close is-large" aria-label="close" onClick=${() => setShowTx(null)} />
    </div>
  `;
};

export default TransactionsList;

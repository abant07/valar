import { ROLE_VAL } from "@/constants/smart-contracts";
import { NoticeboardClient } from "@/contracts/Noticeboard";
import { NoticeboardGlobalState } from "@/interfaces/contracts/Noticeboard";
import { UserInfo } from "@/interfaces/contracts/User";
import { ValidatorAdClient } from "@/contracts/ValidatorAd";
import { ABIAddressType } from "algosdk";
import {
  ValidatorAdGlobalState,
  ValSelfDisclosure,
  ValTermsGating,
  ValTermsPricing,
  ValTermsStakeLimits,
  ValTermsTiming,
  ValTermsWarnings,
  DelAppList
} from "@/interfaces/contracts/ValidatorAd";
import { ValidatorApiBuilder } from "@/utils/api-builder/ValidatorApiBuilder";
import { AlgorandClient, microAlgos } from "@algorandfoundation/algokit-utils";
import { Buffer } from "buffer";
import { TransactionSigner } from "algosdk";
//import { getAlgodConfigFromViteEnvironment } from "@/utils/config/getAlgoClientConfigs";

export class ValidatorAdApiCall {
  /**
   * ================================
   *         Ad Create
   * ================================
   */
  static async adCreate({
    algorandClient,
    noticeBoardClient,
    gsNoticeBoard,
    userAddress,
    userInfo,
    signer,
  }: {
    algorandClient: AlgorandClient;
    noticeBoardClient: NoticeboardClient;
    gsNoticeBoard: NoticeboardGlobalState;
    userAddress: string;
    userInfo: UserInfo;
    signer: TransactionSigner;
  }) {
    const { valAppIdx, feeTxn, txnParams, boxesAdCreate } = await ValidatorApiBuilder.adCreate({
      algorandClient,
      gsNoticeBoard,
      userAddress,
      userInfo,
      signer,
    });

    const res = await noticeBoardClient.adCreate(
      {
        valAppIdx,
        txn: feeTxn,
      },
      {
        sender: {
          addr: userAddress,
          signer,
        },
        boxes: boxesAdCreate,
        sendParams: { fee: microAlgos(txnParams.fee) },
      },
    );

    console.log("APP CREATE")

    try {
      const valClient = new ValidatorAdClient(
        {
          resolveBy: "id",
          id: res.return!,
        },
        algorandClient.client.algod
      );

      const gs = await valClient.getGlobalState();

      // Add MongoDB creation logic here
      const termsTime = ValTermsTiming.decodeBytes(gs.t!.asByteArray());
      const termsPrice = ValTermsPricing.decodeBytes(gs.p!.asByteArray())
      const termsStake = ValTermsStakeLimits.decodeBytes(gs.s!.asByteArray())
      const termsReqs = ValTermsGating.decodeBytes(gs.g!.asByteArray());
      const termsWarn = ValTermsWarnings.decodeBytes(gs.w!.asByteArray());
      const valInfo = ValSelfDisclosure.decodeBytes(gs.v!.asByteArray());
      const delAppList = DelAppList.decodeBytes(gs.delAppList!.asByteArray())


      await fetch("http://localhost:5050/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "appId": Number(res.return!),
          "noticeboardAppId": gs.noticeboardAppId!.asNumber(),
          "termsTime": {
            "roundsSetup": Number(termsTime.roundsSetup),
            "roundsDurationMin": Number(termsTime.roundsDurationMin),
            "roundsDurationMax": Number(termsTime.roundsDurationMax),
            "roundsConfirm": Number(termsTime.roundsConfirm),
            "roundMaxEnd": Number(termsTime.roundMaxEnd)
          },
          "termsPrice": {
            "commission": Number(termsPrice.commission),
            "feeRoundMin": Number(termsPrice.feeRoundMin),
            "feeRoundVar": Number(termsPrice.feeRoundVar),
            "feeSetup": Number(termsPrice.feeSetup),
            "feeAssetId": Number(termsPrice.feeAssetId)
          },
          "termsStake": {
            "stakeMax": Number(termsStake.stakeMax),
            "stakeGratis": Number(termsStake.stakeGratis),
          },
          "termsReqs": {
            "gatingAsaList": [termsReqs.gatingAsaList[0].map(Number), termsReqs.gatingAsaList[1].map(Number)]
          },
          "termsWarn": {
            "cntWarningMax": Number(termsWarn.cntWarningMax),
            "roundsWarning": Number(termsWarn.roundsWarning),
          },

          "valOwner": new ABIAddressType().decode(gs.valOwner!.asByteArray()),
          "valManager": new ABIAddressType().decode(gs.valManager!.asByteArray()),
          "valInfo": {
            "name": valInfo.name,
            "https": valInfo.https,
            "countryCode": valInfo.countryCode,
            "hwCat": Number(valInfo.hwCat),
            "nodeVersion": valInfo.nodeVersion,
          },
          "state": Buffer.from(gs.state!.asByteArray()).toString("base64"),
          "cntDel": gs.cntDel!.asNumber(),
          "cntDelMax": gs.cntDelMax!.asNumber(),

          "delAppList": delAppList.map(Number),
          "tcSha256": Buffer.from(gs.tcSha256!.asByteArray()).toString("base64"),
          "totalAlgoEarned": gs.totalAlgoEarned!.asNumber(),
          "totalAlgoFeesGenerated": gs.totalAlgoFeesGenerated!.asNumber(),
          "cntAsa": gs.cntAsa!.asNumber(),
        }),
      });
    }
    catch(error) {
      console.error(error);
    }

    return res;
  }

  /**
   * ================================
   *         Ad Terms
   * ================================
   */

  static async adTerms({
    algorandClient,
    noticeBoardClient,
    gsValAd,
    userAddress,
    userInfo,
    valAppId,
    terms: { termsTime, termsPrice, termsStake, termsReqs, termsWarn },
    tcSha256,
    signer,
  }: {
    algorandClient: AlgorandClient;
    noticeBoardClient: NoticeboardClient;
    gsValAd: ValidatorAdGlobalState | undefined;
    userAddress: string;
    userInfo: UserInfo;
    valAppId: bigint;
    terms: {
      termsTime: ValTermsTiming;
      termsPrice: ValTermsPricing;
      termsStake: ValTermsStakeLimits;
      termsReqs: ValTermsGating;
      termsWarn: ValTermsWarnings;
    };
    tcSha256: Uint8Array;
    signer: TransactionSigner;
  }) {
    const valAssetId = termsPrice.feeAssetId;

    const {
      valAppIdx,
      foreignApps,
      foreignAssets,
      boxesDel_NoticeBoard,
      boxesDel_ValidatorAd,
      mbrDelegatorTemplateBox,
      feeTxn,
      boxesAdTerms,
      txnParams,
    } = await ValidatorApiBuilder.adTerms({
      algorandClient,
      gsValAd,
      userAddress,
      valAppId,
      valAssetId,
      userInfo,
      signer,
    });

    const res = await noticeBoardClient
      .compose()
      .gas(
        {},
        {
          sender: {
            addr: userAddress,
            signer,
          },
          boxes: boxesDel_ValidatorAd,
          apps: foreignApps,
          sendParams: { fee: microAlgos(txnParams.fee) },
        },
      )
      .gas(
        {},
        {
          sender: {
            addr: userAddress,
            signer,
          },
          boxes: boxesDel_NoticeBoard,
        },
      )
      .adTerms(
        {
          valApp: valAppId,
          valAppIdx,
          tcSha256,
          termsTime: ValTermsTiming.encodeArray(termsTime),
          termsPrice: ValTermsPricing.encodeArray(termsPrice),
          termsStake: ValTermsStakeLimits.encodeArray(termsStake),
          termsReqs: ValTermsGating.encodeArray(termsReqs),
          termsWarn: ValTermsWarnings.encodeArray(termsWarn),
          txn: feeTxn,
          mbrDelegatorTemplateBox,
        },
        {
          sender: {
            addr: userAddress,
            signer,
          },
          boxes: boxesAdTerms,
          assets: foreignAssets,
          sendParams: { fee: microAlgos(txnParams.fee) },
        },
      )
      .execute();

      console.log("AD TERMS");
      try {
        const valClient = new ValidatorAdClient(
          {
            resolveBy: "id",
            id: valAppId,
          },
          algorandClient.client.algod
        );

        const gs = await valClient.getGlobalState();

        // Add MongoDB creation logic here
        const termsTime = ValTermsTiming.decodeBytes(gs.t!.asByteArray());
        const termsPrice = ValTermsPricing.decodeBytes(gs.p!.asByteArray())
        const termsStake = ValTermsStakeLimits.decodeBytes(gs.s!.asByteArray())
        const termsReqs = ValTermsGating.decodeBytes(gs.g!.asByteArray());
        const termsWarn = ValTermsWarnings.decodeBytes(gs.w!.asByteArray());
        const valInfo = ValSelfDisclosure.decodeBytes(gs.v!.asByteArray());
        const delAppList = DelAppList.decodeBytes(gs.delAppList!.asByteArray())

        await fetch(`http://localhost:5050/record/${Number(valAppId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            "data": {
              "appId": Number(valAppId),
              "noticeboardAppId": gs.noticeboardAppId!.asNumber(),
              "termsTime": {
                "roundsSetup": Number(termsTime.roundsSetup),
                "roundsDurationMin": Number(termsTime.roundsDurationMin),
                "roundsDurationMax": Number(termsTime.roundsDurationMax),
                "roundsConfirm": Number(termsTime.roundsConfirm),
                "roundMaxEnd": Number(termsTime.roundMaxEnd)
              },
              "termsPrice": {
                "commission": Number(termsPrice.commission),
                "feeRoundMin": Number(termsPrice.feeRoundMin),
                "feeRoundVar": Number(termsPrice.feeRoundVar),
                "feeSetup": Number(termsPrice.feeSetup),
                "feeAssetId": Number(termsPrice.feeAssetId)
              },
              "termsStake": {
                "stakeMax": Number(termsStake.stakeMax),
                "stakeGratis": Number(termsStake.stakeGratis),
              },
              "termsReqs": {
                "gatingAsaList": [termsReqs.gatingAsaList[0].map(Number), termsReqs.gatingAsaList[1].map(Number)]
              },
              "termsWarn": {
                "cntWarningMax": Number(termsWarn.cntWarningMax),
                "roundsWarning": Number(termsWarn.roundsWarning),
              },

              "valOwner": new ABIAddressType().decode(gs.valOwner!.asByteArray()),
              "valManager": new ABIAddressType().decode(gs.valManager!.asByteArray()),
              "valInfo": {
                "name": valInfo.name,
                "https": valInfo.https,
                "countryCode": valInfo.countryCode,
                "hwCat": Number(valInfo.hwCat),
                "nodeVersion": valInfo.nodeVersion,
              },
              "state": Buffer.from(gs.state!.asByteArray()).toString("base64"),
              "cntDel": gs.cntDel!.asNumber(),
              "cntDelMax": gs.cntDelMax!.asNumber(),

              "delAppList": delAppList.map(Number),
              "tcSha256": Buffer.from(gs.tcSha256!.asByteArray()).toString("base64"),
              "totalAlgoEarned": gs.totalAlgoEarned!.asNumber(),
              "totalAlgoFeesGenerated": gs.totalAlgoFeesGenerated!.asNumber(),
              "cntAsa": gs.cntAsa!.asNumber(),
          }}),
        });
      }
      catch(error) {
        console.error(error);
      }

    return res;
  }

  /**
   * =============================
   *         Ad Config
   * =============================
   */

  static async adConfig({
    noticeBoardClient,
    gsValidatorAd,
    userAddress,
    userInfo,
    valManagerAddr,
    live,
    cntDelMax,
    valAppId,
    signer,
  }: {
    noticeBoardClient: NoticeboardClient;
    gsValidatorAd: ValidatorAdGlobalState;
    userAddress: string;
    userInfo: UserInfo;
    valManagerAddr: string;
    live: boolean;
    cntDelMax: bigint;
    valAppId: bigint;
    signer: TransactionSigner;
  }) {
    const { valAppIdx, boxesAdConfig, txnParams } = await ValidatorApiBuilder.adConfig({
      gsValidatorAd,
      userAddress,
      userInfo,
      valAppId,
    });

    const res = await noticeBoardClient.adConfig(
      {
        valApp: valAppId,
        valAppIdx,
        valManager: valManagerAddr,
        live,
        cntDelMax,
      },
      {
        sender: {
          addr: userAddress,
          signer,
        },
        boxes: boxesAdConfig,
        sendParams: { fee: microAlgos(txnParams.fee) },
      },
    );

    console.log("ADD CONFIG ALONE");
    return res;
  }

  /**
   * ============================
   *         Ad Delete
   * ============================
   */

  static async adDelete({
    algorandClient,
    noticeBoardClient,
    userAddress,
    userInfo,
    valAppId,
  }: {
    algorandClient: AlgorandClient;
    noticeBoardClient: NoticeboardClient;
    userAddress: string;
    userInfo: UserInfo;
    valAppId: bigint;
  }) {
    const { valAppIdx, foreignApps, boxesAdDelete, boxesDelVal, txnParams } = await ValidatorApiBuilder.adDelete({
      algorandClient,
      userAddress,
      userInfo,
      valAppId,
    });

    const res = await noticeBoardClient
      .compose()
      .gas(
        {},
        {
          boxes: boxesDelVal,
          apps: foreignApps,
        },
      )
      .adDelete(
        {
          valApp: valAppId,
          valAppIdx,
        },
        {
          boxes: boxesAdDelete,
          sendParams: { fee: microAlgos(txnParams.fee) },
        },
      )
      .execute();

      try {
        // TODO: CHANGE URL LATER
        await fetch(`http://localhost:5050/record/${Number(valAppId)}`, {
          method: "DELETE"
        });
      }
      catch(error) {
        console.error(error);
      }

    return res;
  }

  /**
   * =============================
   *         Ad Self Disclose
   * =============================
   */

  static async adSelfDisclose({
    noticeBoardClient,
    userAddress,
    userInfo,
    valAppId,
    valInfo,
  }: {
    noticeBoardClient: NoticeboardClient;
    userAddress: string;
    userInfo: UserInfo;
    valAppId: bigint;
    valInfo: ValSelfDisclosure;
  }) {
    const { valAppIdx, boxesASD, txnParams } = await ValidatorApiBuilder.adSelfDisclose({
      userAddress,
      userInfo,
      valAppId,
    });

    const res = await noticeBoardClient.adSelfDisclose(
      {
        valApp: valAppId,
        valAppIdx,
        valInfo: ValSelfDisclosure.encodeArray(valInfo),
      },
      {
        boxes: boxesASD,
        sendParams: { fee: microAlgos(txnParams.fee) },
      },
    );

    return res;
  }

  /**
   * ============================
   *         Ad Income
   * ============================
   */

  static async adIncome({
    noticeBoardClient,
    userAddress,
    userInfo,
    valAppId,
    valAssetId,
    signer,
  }: {
    noticeBoardClient: NoticeboardClient;
    userAddress: string;
    userInfo: UserInfo;
    valAppId: bigint;
    valAssetId: bigint;
    signer: TransactionSigner;
  }) {
    const { valAppIdx, foreignAssets, boxesAdIncome, txnParams } = await ValidatorApiBuilder.adIncome({
      userAddress,
      userInfo,
      valAppId,
      valAssetId,
    });
    const res = noticeBoardClient.adIncome(
      {
        valApp: valAppId,
        valAppIdx,
        assetId: valAssetId,
      },
      {
        sender: {
          addr: userAddress,
          signer,
        },
        boxes: boxesAdIncome,
        assets: foreignAssets,
        sendParams: { fee: microAlgos(txnParams.fee) },
      },
    );

    return res;
  }

  /**
   * ============================
   *         Ad ASA Close
   * ============================
   */

  static async adASAClose({
    noticeBoardClient,
    userAddress,
    userInfo,
    valAppId,
    valAssetId,
  }: {
    algorandClient: AlgorandClient;
    noticeBoardClient: NoticeboardClient;
    userAddress: string;
    userInfo: UserInfo;
    valAppId: bigint;
    valAssetId: bigint;
  }) {
    const { valAppIdx, foreignAssets, boxAdASAClose, txnParams } = await ValidatorApiBuilder.adASAClose({
      userAddress,
      userInfo,
      valAppId,
      valAssetId,
    });

    const res = await noticeBoardClient.adAsaClose(
      {
        valApp: valAppId,
        valAppIdx,
        assetId: valAssetId,
      },
      {
        boxes: boxAdASAClose,
        assets: foreignAssets,
        sendParams: { fee: microAlgos(txnParams.fee) },
      },
    );

    return res;
  }

  /**
   * ============================
   *     Ad Terms and Config
   * ============================
   */

  static async adTermsAndConfig({
    algorandClient,
    noticeBoardClient,
    gsValAd,
    userAddress,
    userInfo,
    valAppId,
    terms: { termsTime, termsPrice, termsStake, termsReqs, termsWarn },
    tcSha256,
    config: { valManagerAddr, live, cntDelMax },
    signer,
  }: {
    algorandClient: AlgorandClient;
    noticeBoardClient: NoticeboardClient;
    gsValAd: ValidatorAdGlobalState | undefined;
    userAddress: string;
    userInfo: UserInfo;
    valAppId: bigint;
    terms: {
      termsTime: ValTermsTiming;
      termsPrice: ValTermsPricing;
      termsStake: ValTermsStakeLimits;
      termsReqs: ValTermsGating;
      termsWarn: ValTermsWarnings;
    };
    tcSha256: Uint8Array;
    config: {
      valManagerAddr: string;
      live: boolean;
      cntDelMax: bigint;
    };
    signer: TransactionSigner;
  }) {
    const valAssetId = termsPrice.feeAssetId;

    const {
      valAppIdx,
      foreignApps,
      foreignAssets,
      boxesDel_NoticeBoard,
      boxesDel_ValidatorAd,
      mbrDelegatorTemplateBox,
      feeTxn,
      boxesAdTerms,
      txnParams,
    } = await ValidatorApiBuilder.adTermsAndConfig({
      algorandClient,
      gsValAd,
      userAddress,
      valAppId,
      valAssetId,
      userInfo,
      signer,
    });

    const res = await noticeBoardClient
      .compose()
      .gas(
        {},
        {
          sender: {
            addr: userAddress,
            signer,
          },
          boxes: boxesDel_ValidatorAd,
          apps: foreignApps,
          sendParams: { fee: microAlgos(txnParams.fee) },
        },
      )
      .gas(
        {},
        {
          sender: {
            addr: userAddress,
            signer,
          },
          boxes: boxesDel_NoticeBoard,
        },
      )
      .adTerms(
        {
          valApp: valAppId,
          valAppIdx,
          tcSha256,
          termsTime: ValTermsTiming.encodeArray(termsTime),
          termsPrice: ValTermsPricing.encodeArray(termsPrice),
          termsStake: ValTermsStakeLimits.encodeArray(termsStake),
          termsReqs: ValTermsGating.encodeArray(termsReqs),
          termsWarn: ValTermsWarnings.encodeArray(termsWarn),
          txn: feeTxn,
          mbrDelegatorTemplateBox,
        },
        {
          sender: {
            addr: userAddress,
            signer,
          },
          boxes: boxesAdTerms,
          assets: foreignAssets,
          sendParams: { fee: microAlgos(txnParams.fee) },
        },
      )
      .adConfig(
        {
          valApp: valAppId,
          valAppIdx,
          valManager: valManagerAddr,
          live,
          cntDelMax,
        },
        {
          sender: {
            addr: userAddress,
            signer,
          },
          // boxes: boxesUser,  // is already included in boxesAdTerms
          // sendParams: { fee: microAlgos(txnParams.fee) }, // already covered within adTerms
        },
      )
      .execute();

      try {

        const valClient = new ValidatorAdClient(
          {
            resolveBy: "id",
            id: valAppId,
          },
          algorandClient.client.algod,
        );

        const gs = await valClient.getGlobalState();

        // Add MongoDB creation logic here
        const termsTime = ValTermsTiming.decodeBytes(gs.t!.asByteArray());
        const termsPrice = ValTermsPricing.decodeBytes(gs.p!.asByteArray())
        const termsStake = ValTermsStakeLimits.decodeBytes(gs.s!.asByteArray())
        const termsReqs = ValTermsGating.decodeBytes(gs.g!.asByteArray());
        const termsWarn = ValTermsWarnings.decodeBytes(gs.w!.asByteArray());
        const valInfo = ValSelfDisclosure.decodeBytes(gs.v!.asByteArray());
        const delAppList = DelAppList.decodeBytes(gs.delAppList!.asByteArray())

        console.log("APP ID" + String(valAppId));

        await fetch(`http://localhost:5050/record/${Number(valAppId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({"data" : {
            "appId": Number(valAppId),
            "noticeboardAppId": gs.noticeboardAppId!.asNumber(),
            "termsTime": {
              "roundsSetup": Number(termsTime.roundsSetup),
              "roundsDurationMin": Number(termsTime.roundsDurationMin),
              "roundsDurationMax": Number(termsTime.roundsDurationMax),
              "roundsConfirm": Number(termsTime.roundsConfirm),
              "roundMaxEnd": Number(termsTime.roundMaxEnd)
            },
            "termsPrice": {
              "commission": Number(termsPrice.commission),
              "feeRoundMin": Number(termsPrice.feeRoundMin),
              "feeRoundVar": Number(termsPrice.feeRoundVar),
              "feeSetup": Number(termsPrice.feeSetup),
              "feeAssetId": Number(termsPrice.feeAssetId)
            },
            "termsStake": {
              "stakeMax": Number(termsStake.stakeMax),
              "stakeGratis": Number(termsStake.stakeGratis),
            },
            "termsReqs": {
              "gatingAsaList": [termsReqs.gatingAsaList[0].map(Number), termsReqs.gatingAsaList[1].map(Number)]
            },
            "termsWarn": {
              "cntWarningMax": Number(termsWarn.cntWarningMax),
              "roundsWarning": Number(termsWarn.roundsWarning),
            },

            "valOwner": new ABIAddressType().decode(gs.valOwner!.asByteArray()),
            "valManager": new ABIAddressType().decode(gs.valManager!.asByteArray()),
            "valInfo": {
              "name": valInfo.name,
              "https": valInfo.https,
              "countryCode": valInfo.countryCode,
              "hwCat": Number(valInfo.hwCat),
              "nodeVersion": valInfo.nodeVersion,
            },
            "state": Buffer.from(gs.state!.asByteArray()).toString("base64"),
            "cntDel": gs.cntDel!.asNumber(),
            "cntDelMax": gs.cntDelMax!.asNumber(),

            "delAppList": delAppList.map(Number),
            "tcSha256": Buffer.from(gs.tcSha256!.asByteArray()).toString("base64"),
            "totalAlgoEarned": gs.totalAlgoEarned!.asNumber(),
            "totalAlgoFeesGenerated": gs.totalAlgoFeesGenerated!.asNumber(),
            "cntAsa": gs.cntAsa!.asNumber(),
          }}),
        });
      }
      catch(error) {
        console.error(error);
      }

    return res;
  }

  /**
   * ==================================
   *      User Create & Ad Create
   * ==================================
   */

  static async userCreateAndAdCreate({
    algorandClient,
    noticeBoardClient,
    gsNoticeBoard,
    userAddress,
    signer,
  }: {
    algorandClient: AlgorandClient;
    noticeBoardClient: NoticeboardClient;
    gsNoticeBoard: NoticeboardGlobalState;
    userAddress: string;
    signer: TransactionSigner;
  }) {
    const { valAppIdx, feeTxnUserCreate, feeTxnAdCreate, txnParams, boxesUserCreate, boxesAdCreate } =
      await ValidatorApiBuilder.userCreateAndAdCreate({
        algorandClient,
        gsNoticeBoard,
        userAddress,
        signer,
      });

    const res = await noticeBoardClient
      .compose()
      .userCreate(
        {
          userRole: ROLE_VAL,
          txn: feeTxnUserCreate,
        },
        {
          sender: {
            addr: userAddress,
            signer,
          },
          boxes: boxesUserCreate,
          sendParams: { fee: microAlgos(txnParams.fee) },
        },
      )
      .adCreate(
        {
          valAppIdx,
          txn: feeTxnAdCreate,
        },
        {
          sender: {
            addr: userAddress,
            signer,
          },
          boxes: boxesAdCreate,
        },
      )
      .execute();

      console.log("APP USER AND CREATE")

      try {
        const valClient = new ValidatorAdClient(
          {
            resolveBy: "id",
            id: res.returns[1],
          },
          algorandClient.client.algod,
        );

        const gs = await valClient.getGlobalState();

        // Add MongoDB creation logic here
        const termsTime = ValTermsTiming.decodeBytes(gs.t!.asByteArray());
        const termsPrice = ValTermsPricing.decodeBytes(gs.p!.asByteArray())
        const termsStake = ValTermsStakeLimits.decodeBytes(gs.s!.asByteArray())
        const termsReqs = ValTermsGating.decodeBytes(gs.g!.asByteArray());
        const termsWarn = ValTermsWarnings.decodeBytes(gs.w!.asByteArray());
        const valInfo = ValSelfDisclosure.decodeBytes(gs.v!.asByteArray());
        const delAppList = DelAppList.decodeBytes(gs.delAppList!.asByteArray())

        await fetch("http://localhost:5050/record", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            "appId": Number(res.returns[1]),
            "noticeboardAppId": gs.noticeboardAppId!.asNumber(),
            "termsTime": {
              "roundsSetup": Number(termsTime.roundsSetup),
              "roundsDurationMin": Number(termsTime.roundsDurationMin),
              "roundsDurationMax": Number(termsTime.roundsDurationMax),
              "roundsConfirm": Number(termsTime.roundsConfirm),
              "roundMaxEnd": Number(termsTime.roundMaxEnd)
            },
            "termsPrice": {
              "commission": Number(termsPrice.commission),
              "feeRoundMin": Number(termsPrice.feeRoundMin),
              "feeRoundVar": Number(termsPrice.feeRoundVar),
              "feeSetup": Number(termsPrice.feeSetup),
              "feeAssetId": Number(termsPrice.feeAssetId)
            },
            "termsStake": {
              "stakeMax": Number(termsStake.stakeMax),
              "stakeGratis": Number(termsStake.stakeGratis),
            },
            "termsReqs": {
              "gatingAsaList": [termsReqs.gatingAsaList[0].map(Number), termsReqs.gatingAsaList[1].map(Number)]
            },
            "termsWarn": {
              "cntWarningMax": Number(termsWarn.cntWarningMax),
              "roundsWarning": Number(termsWarn.roundsWarning),
            },

            "valOwner": new ABIAddressType().decode(gs.valOwner!.asByteArray()),
            "valManager": new ABIAddressType().decode(gs.valManager!.asByteArray()),
            "valInfo": {
              "name": valInfo.name,
              "https": valInfo.https,
              "countryCode": valInfo.countryCode,
              "hwCat": Number(valInfo.hwCat),
              "nodeVersion": valInfo.nodeVersion,
            },
            "state": Buffer.from(gs.state!.asByteArray()).toString("base64"),
            "cntDel": gs.cntDel!.asNumber(),
            "cntDelMax": gs.cntDelMax!.asNumber(),

            "delAppList": delAppList.map(Number),
            "tcSha256": Buffer.from(gs.tcSha256!.asByteArray()).toString("base64"),
            "totalAlgoEarned": gs.totalAlgoEarned!.asNumber(),
            "totalAlgoFeesGenerated": gs.totalAlgoFeesGenerated!.asNumber(),
            "cntAsa": gs.cntAsa!.asNumber(),
          }),
        });
      }
      catch(error) {
        console.log("ERROR Creating")
        console.error(error);
      }

    return res;
  }
}
import express from "express";

// This will help us connect to the database
import db from "../db/connection.js";

// This help convert the id from string to ObjectId for the _id.
import { ObjectId } from "mongodb";

// router is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const router = express.Router();

// This section will help you get a single record by id
router.get("/:appId", async (req, res) => {
  let collection = await db.collection("validator_ads");
  let query = { appId: Number(req.params.appId) };
  let result = await collection.findOne(query);

  if (!result) res.send("Not found").status(404);
  else res.send(result).status(200);
});

// This section will help you create a new record.
router.post("/", async (req, res) => {
  try {
    let newDocument = {
      appId: req.body.appId,
      noticeboardAppId: req.body.noticeboardAppId,
      termsTime: req.body.termsTime,
      termsPrice: req.body.termsPrice,
      termsStake: req.body.termsStake,
      termsReqs: req.body.termsReqs,
      termsWarn: req.body.termsWarn,

      valOwner: req.body.valOwner,
      valManager: req.body.valManager,
      valInfo: req.body.valInfo,
      state: req.body.state,
      cntDel: req.body.cntDel,
      cntDelMax: req.body.cntDelMax,

      delAppList: req.body.delAppList,
      tcSha256: req.body.tcSha256,
      totalAlgoEarned: req.body.totalAlgoEarned,
      totalAlgoFeesGenerated: req.body.totalAlgoFeesGenerated,
      cntAsa: req.body.cntAsa,
    };
    let collection = await db.collection("validator_ads");
    let result = await collection.insertOne(newDocument);
    res.send(result).status(204);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding record");
  }
});

// This section will help you update a record by id.
router.patch("/:appId", async (req, res) => {
  try {
    const query = { appId: Number(req.params.appId) };
    const updates = {
      $set: req.body.data,
    };

    let collection = await db.collection("validator_ads");
    let result = await collection.updateOne(query, updates);
    res.send(result).status(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating record");
  }
});


// This section will help you delete a record
router.delete("/:appId", async (req, res) => {
  try {
    const query = { appId: Number(req.params.appId) };

    const collection = db.collection("validator_ads");
    let result = await collection.deleteOne(query);

    res.send(result).status(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting record");
  }
});


export default router;
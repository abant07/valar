import { MongoClient, ServerApiVersion } from "mongodb";

const URI = process.env.ATLAS_URI || "";
const client = new MongoClient(URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

try {
  // Connect the client to the server
  await client.connect();
  db = client.db("valar");
  // Send a ping to confirm a successful connection
  await client.db("admin").command({ ping: 1 });
  console.log("Pinged your deployment. You successfully connected to MongoDB!");

  await db.collection("validator_ads").createIndex({ appId: 1 }, {unique : true})
  console.log("unique index on app id")
} catch (err) {
  console.error(err);
}

export default db;
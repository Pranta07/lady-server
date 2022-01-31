const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const ObjectId = require("mongodb").ObjectId;

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yxq3j.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function run() {
    try {
        await client.connect();
        // console.log("database connected");
        const database = client.db("LadyShop");
        const trendingCollection = database.collection("Trending");
        const popularCollection = database.collection("Popular");
        const recentCollection = database.collection("Recent");
        const randomCollection = database.collection("Random");

        //get api for trending products
        app.get("/trending", async (req, res) => {
            const result = await trendingCollection.find({}).toArray();
            res.json(result);
        });

        //get api for single product
        app.get("/singleProduct/:id", async (req, res) => {
            const query = {
                _id: ObjectId(req.params.id),
            };
            // console.log(req.query.type);
            const type = req.query.type;
            let collection;
            if (type === "trending") {
                collection = trendingCollection;
            } else if (type == "popular") {
                collection = popularCollection;
            } else if (type == "recent") {
                collection = recentCollection;
            } else if (type == "random") {
                collection = randomCollection;
            }
            const result = await collection.findOne(query);
            res.json(result);
        });
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("lady running!");
});

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});

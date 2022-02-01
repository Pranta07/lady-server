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
        const productsCollection = database.collection("products");

        //get api for products
        app.get("/products", async (req, res) => {
            const type = req.query.type;
            const page = req.query.page;
            const query = type === "catalog" ? {} : { type };

            const cursor = productsCollection.find(query);

            const count = await cursor.count();
            let result;
            if (type === "catalog") {
                result = await cursor
                    .skip(page * 8)
                    .limit(8)
                    .toArray();
            } else {
                result = await cursor.toArray();
            }

            res.json({ count, result });
        });

        //get api for single product
        app.get("/singleProduct/:id", async (req, res) => {
            const query = {
                _id: ObjectId(req.params.id),
            };
            const result = await productsCollection.findOne(query);
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

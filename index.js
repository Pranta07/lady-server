const express = require("express");
const { MongoClient } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yxq3j.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

client.connect((err) => {
    const collection = client.db("test").collection("devices");
    // perform actions on the collection object
    console.log("database connected");
    // client.close();
});

app.get("/", (req, res) => {
    res.send("lady running!");
});

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});

const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const ObjectId = require("mongodb").ObjectId;
const SSLCommerzPayment = require("sslcommerz");
const { v4: uuidv4 } = require("uuid");

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
        const ordersCollection = database.collection("orders");
        const usersCollection = database.collection("users");

        app.get("/allProducts", async (req, res) => {
            const result = await productsCollection.find({}).toArray();
            res.json(result);
        });

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

        //payment initialization
        app.post("/init", async (req, res) => {
            const data = {
                total_amount: req.body.total,
                currency: "BDT",
                tran_id: uuidv4(),
                payment_status: false,
                success_url: "https://ancient-dawn-22893.herokuapp.com/success",
                fail_url: "https://ancient-dawn-22893.herokuapp.com/fail",
                cancel_url: "https://ancient-dawn-22893.herokuapp.com/cancel",
                ipn_url: "https://ancient-dawn-22893.herokuapp.com/ipn",
                shipping_method: "Courier",
                product_name: "Lady",
                product_category: "dress",
                product_profile: "general",
                ordered_products: req.body.products,
                cus_name: req.body.firstName,
                cus_email: req.body.email,
                cus_add1: req.body.street,
                cus_add2: "Dhaka",
                cus_city: req.body.city,
                cus_state: req.body.region,
                cus_postcode: req.body.postCode,
                cus_country: req.body.country,
                cus_phone: req.body.phone,
                cus_fax: req.body.phone,
                ship_name: "Customer Name",
                ship_add1: "Dhaka",
                ship_add2: "Dhaka",
                ship_city: "Dhaka",
                ship_state: "Dhaka",
                ship_postcode: 1000,
                ship_country: "Bangladesh",
            };
            // console.log(data);
            //insert this data into database...
            const order = await ordersCollection.insertOne(data);

            const sslcommer = new SSLCommerzPayment(
                process.env.STORE_ID,
                process.env.STORE_PASS,
                false
            ); //true for live default false for sandbox
            sslcommer.init(data).then((data) => {
                //process the response that got from sslcommerz
                //https://developer.sslcommerz.com/doc/v4/#returned-parameters
                // console.log(data);
                if (data.GatewayPageURL) {
                    res.json(data.GatewayPageURL);
                } else {
                    res.status(400).json({
                        message: "Payment Session Failed!",
                    });
                }
            });
        });

        app.post("/success", async (req, res) => {
            // console.log(req.body);
            //update the data by finding using tran_id from req.body
            //set val id to this data from req.body for validation purpose...
            const filter = { tran_id: req.body.tran_id };
            const updateDoc = {
                $set: {
                    val_id: req.body.val_id,
                },
            };
            const order = await ordersCollection.updateOne(filter, updateDoc);

            return res
                .status(200)
                .redirect(
                    `https://ladyecommerce-d15fd.web.app/success/${req.body.tran_id}`
                );
            // return res.status(200).json(req.body);
        });
        app.post("/fail", async (req, res) => {
            // console.log(req.body);
            //delete the data from database using tran_id from req.body
            const filter = { tran_id: req.body.tran_id };
            const order = await ordersCollection.deleteOne(filter);

            return res
                .status(400)
                .redirect("https://ladyecommerce-d15fd.web.app");
        });
        app.post("/cancel", async (req, res) => {
            // console.log(req.body);
            //delete the data from database using tran_id from req.body
            const filter = { tran_id: req.body.tran_id };
            const order = await ordersCollection.deleteOne(filter);

            return res
                .status(200)
                .redirect("https://ladyecommerce-d15fd.web.app");
        });

        //get api for specific order by tran_id
        app.get("/orders/:id", async (req, res) => {
            const filter = { tran_id: req.params.id };
            const order = await ordersCollection.findOne(filter);
            res.json(order);
        });

        //post api to validate the payment
        app.post("/validate", async (req, res) => {
            const { tran_id, val_id } = req.body;
            const order = await ordersCollection.findOne({ tran_id });

            if (order.val_id === val_id) {
                const result = await ordersCollection.updateOne(
                    { tran_id },
                    {
                        $set: {
                            payment_status: true,
                        },
                    }
                );
                // console.log(result);
                res.json(result);
            } else {
                res.json({});
            }
        });

        //get api for a customer order
        app.get("/orders", async (req, res) => {
            const email = req.query.email;
            const query = { cus_email: email };
            const result = await ordersCollection.find(query).toArray();
            res.json(result);
        });

        // post api to save user in db
        app.post("/user", async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const result = await usersCollection.findOne(query);
            if (!result) {
                await usersCollection.insertOne(user);
            }
        });

        //get api for a specific user
        app.get("/user/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const result = await usersCollection.findOne(query);
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

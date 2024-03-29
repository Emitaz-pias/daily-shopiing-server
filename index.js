const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
ObjectID = require("mongodb").ObjectID;
var admin = require("firebase-admin");

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// connect firebase sdk
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.DB}.firebaseio.com`,
});

// connect to database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@dailyshopping.r30gy.mongodb.net/${process.env.DB}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

client.connect((err) => {
  // products collections
  const products = client
    .db(`${process.env.DB}`)
    .collection(`${process.env.PRODUCTS_COLLECTION}`);
  console.log("db connected");

  // orders collection
  const orders = client
    .db(`${process.env.DB}`)
    .collection(`${process.env.ORDERS_COLLECTION}`);

  // all the post apis

  // post a product
  app.post("/addProduct", (req, res) => {
    const product = req.body;
    products.insertOne(product).then((result) => {
      if (result.insertedCount > 0) {
        console.log("i'm inserted this one", result);
        res.send(true);
      }
    });
  });

  // post order to server

  app.post("/placeOrder", (req, res) => {
    console.log("the order is", req.body);
    const order = req.body;
    orders
      .insertOne(order)
      .then((result, error) => console.log("error is ", error, result));
  });

  // all the get apis

  // get all the products for home page
  app.get("/products", (req, res) => {
    products
      .find({})
      .toArray()
      .then((product) => res.send(product));
  });

  // get orders of a certain user
  app.get("/orders", (req, res) => {
    const bearer = req.headers.authorization;
    if (bearer && bearer.startsWith("Bearer ")) {
      const idToken = bearer.split(" ")[1];
      admin
        .auth()
        .verifyIdToken(idToken)
        .then((decodedToken) => {
          const decodedEmail = decodedToken.email;
          const providedEmail = req.query.email;
          if (providedEmail === decodedEmail) {
            orders
              .find({ email: providedEmail })
              .toArray((err, orders) => res.send(orders));
          } else {
            res.send("404 Not Found acces denied");
          }
        })
        .catch((error) => {});
    }
  });

  // get products for manage products
  app.get("/manageProducts", (req, res) => {
    products
      .find({})
      .toArray()
      .then((products) => res.send(products));
  });

  // delete product when delete button is clicked

  app.delete("/product/:id", (req, res) => {
    const id = req.params.id;
    products.removeOne({ _id: ObjectID(id) }).then((result) => {
      res.send(result.deletedCount > 0);
    });
  });
});
const port = 5000;
app.get("/", (req, res) => {
  res.send("app is alaive");
});
app.listen(process.env.PORT || port, () => {
  console.log("app is alive");
});

const express = require("express"); //http server
const cors = require("cors"); //cross-origin requests
const mongo = require("mongodb"); //mongodb database

const app = express(); //define new express server
app.use(cors()); //use middleware to allow cross-origin requests
app.use(express.json()); //use middleware to parse json body of http requests

let brs = {
    port: process.env.PORT || 8000, //http server port
    uri: `mongodb+srv://brs:${process.env.DB_PASS}@brselec.y9ucrzk.mongodb.net/?retryWrites=true&w=majority&zlibCompressionLevel=3`, //mongodb database url
    connected: false, //database connection status
};

//database connection information
const client = new mongo.MongoClient(brs.uri, {
    serverApi: {
        version: mongo.ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

function genkey() {
    return Math.floor(
        Math.random() *
        Math.floor(
            Math.random() *
            Date.now()
        )
    ).toString(32);
}

//initialize database connection
initdb = async () => {
    await client.connect(); //initialize database client
    brs.connected = true;
    console.log("db initialized");
}
initdb();

app.post("/vote/:key", async (req, res) => {
    if (brs.connected) {
        client.db("edata").collection("keys").find({
            key: req.params.key
        }).project({
            _id: 0
        }).toArray().then((l) => {
            if (l.length > 0) {
                console.log(req.body);
                client.db("edata").collection("votes").insertOne(req.body).then(() => {
                    client.db("edata").collection("keys").deleteOne({
                        key: req.params.key
                    });
                    res.status(200).send("posted successfully");
                }).catch((err) => {
                    console.log(err);
                });
            } else {
                res.status(403).send("invalid passkey");
            }
        }).catch((err) => {
            console.log(err);
            res.status(500).send("internal server error");
        });
    } else {
        res.status(500).send("db disconnected");
    }
});

app.get("/newkey/:pass/", (req, res) => {
    if (brs.connected && req.params.pass == process.env.PASS) {
        let count = req.query.n || 1;
        let i = 0;
        let arr = [];
        let ls = [];
        while (i < count) {
            c = genkey();
            arr.push({
                key: c
            });
            ls.push(c);
            i++;
        }
        console.log(i);
        client.db("edata").collection("keys").insertMany(arr).then(() => {
            res.status(200).send(ls.join("<br>"));
        }).catch((err) => {
            console.log(err);
            res.status(500).send("internal server error");
        });
    } else {
        res.status(403).send("wrong password");
    }
});

app.get("/delkey/:pass/:key", (req, res) => {
    if (brs.connected && req.params.pass == process.env.PASS) {
        client.db("edata").collection("keys").deleteOne({
            key: req.params.key
        }).then(() => {
            res.status(200).send("deleted key");
        }).catch((err) => {
            console.log(err);
            res.status(500).send("internal server error");
        });
    }
});

app.get("/clearkeys/:pass", (req, res) => {
    if (brs.connected && req.params.pass == process.env.PASS) {
        client.db("edata").collection("keys").deleteMany({}).then(() => {
            res.status(200).send("deleted all keys");
        }).catch((err) => {
            console.log(err);
            res.status(500).send("internal server error");
        });
    } else {
        res.status(403).send("wrong password");
    }
});

app.get("/getvotes/", (_req, res) => {
    client.db("edata").collection("votes").find({}).project({
        _id: 0
    }).toArray().then((e) => {
        res.status(200).send(e);
    }).catch((err) => {
        console.log(err);
        res.status(500).send("internal server error");
    });
});

app.get("/getkeys/:pass", (req, res) => {
    if (brs.connected && req.params.pass == process.env.PASS) {
        client.db("edata").collection("keys").find({}).project({
            _id: 0
        }).toArray().then((e) => {
            res.status(200).send(e);
        }).catch((err) => {
            console.log(err);
            res.status(500).send("internal server error");
        });
    } else {
        res.status(403).send("wrong password");
    }
});

app.listen(brs.port, () => {
    console.log(`Example app listening on port ${brs.port}`)
});
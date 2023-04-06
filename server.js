var express = require("express");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var moment = require("moment");
var ObjectID = mongodb.ObjectID;

var CONTACTS_COLLECTION = "contacts";
var ITEM_COLLECTION = "items";
var ITEM_TYPE_COLLECTION = "item_type";

var app = express();
// app.use(bodyParser.json());
app.use(bodyParser.json({limit: "50mb"}));

// Create link to Angular build directory
var distDir = __dirname + "/dist/";
app.use(express.static(distDir));

// Deshabilitar en producción
 
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:4200"); // update to match the domain you will make the request from
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
 
// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/blackmarketmaster",
  function(err, client) {
    if (err) {
      console.log(err);
      process.exit(1);
    }

    // Save database object from the callback for reuse.
    db = client.db();
    console.log("Database connection ready");

    // Initialize the app.
    var server = app.listen(process.env.PORT || 8080, function() {
      var port = server.address().port;
      console.log("App now running on port", port);
    });
  }
);

// CONTACTS API ROUTES BELOW

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({ error: message });
}

/* API */

app.get("/api/item_type", function(req, res) {
  db.collection(ITEM_TYPE_COLLECTION)
    .find({})
    .toArray(function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get contacts.");
      } else { 
        res.status(200).json(docs);
      }
    });
});

app.get("/api/item_type/:class", function(req, res) {
  db.collection(req.params.class)
    .find({})
    .toArray(function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get contacts.");
      } else { 
        
        docs.sort(function (a, b) {
          if (a.Name > b.Name) {
            return 1;
          }
          if (a.Name < b.Name) {
            return -1;
          } 
          // Else go to the 2nd item 
          return 0; 
        }); 

        res.status(200).json(docs);
      }
    });
});

app.get("/api/item_class/:item", function(req, res) {
  db.collection(req.params.item)
    .find({})
    .toArray(function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get contacts.");
      } else {
        res.status(200).json(docs);
      }
    });
});

app.get("/api/item/:item", function(req, res) {
  db.collection(ITEM_COLLECTION)
    .find({ UniqueName: req.params.item })
    .toArray(function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get contacts.");
      } else {
        res.status(200).json(docs);
      }
    });
});


app.post("/api/marketmaster", function(req, res) { 
  var newContact = req.body;

  var result = [];  

  var minutes = newContact[1];
  var tax = newContact[2] / 100;
  var returns = newContact[3];  

  newContact[0].forEach(element => {
    if (element["BuyPriceBM"] - (element["BuyPriceBM"] * tax) > element["SellPriceCM"] && element["SellPriceCM"] > 0 && (element["BuyPriceBM"] - (element["BuyPriceBM"] * tax) - element["SellPriceCM"]) > returns)
    {
      var date1 = moment(element["BuyPriceDate"],'YYYY-MM-DD HH:mm:ss').toDate(); 
      var date2 = moment(element["SellPriceDate"],'YYYY-MM-DD HH:mm:ss').toDate(); 
     
      if (Math.abs(moment(date1).diff(date2, 'minutes')) < minutes)      
      {
        element["EstimatedReturn"] = element["BuyPriceBM"] - (element["BuyPriceBM"] * tax) - element["SellPriceCM"];
        element["EstimatedReturn"] = Math.round(element["EstimatedReturn"]);
        result.push(element); 
      }
    } 
  });
   
  result.sort(function (a, b) {
    if ((a.BuyPriceBM - (a.BuyPriceBM * tax) - a.SellPriceCM) < (b.BuyPriceBM - (b.BuyPriceBM * tax) - b.SellPriceCM)) {
      return 1;
    }
    if ((a.BuyPriceBM - (a.BuyPriceBM * tax) - a.SellPriceCM) > (b.BuyPriceBM - (b.BuyPriceBM * tax) - b.SellPriceCM)) {
      return -1;
    }
     
    return 0; 
  });

  res.status(201).json(result); 
});
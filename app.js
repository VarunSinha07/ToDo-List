const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose")
const _ = require("lodash");
const date = require(__dirname + "/date.js");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb://127.0.0.1:27017/todolistDB");


const day = date.getDate(); 

const itemSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemSchema);

const item1 = new Item({
  name: "Welcome to our todo list."
});

const item2 = new Item({
  name: "Hit the + button to add a new item. "
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

const defaultItems =  [item1,item2,item3];

const listSchema  = new mongoose.Schema({
  name: String,
  items: [itemSchema]
});

const  List = mongoose.model("List", listSchema);

app.get("/", function(req, res) {

  
  Item.find({}).then(function(foundItems){
    if(foundItems.length === 0){
      Item.insertMany(defaultItems).then(function(){
        console.log("Defaul  items added");
      }).catch(function(error){
        console.log(error);
      })
      res.redirect("/");
    } else{
      res.render("list", {listTitle: day, newListItems: foundItems});
    }

  }).catch(function(error){
    console.log(error);
  })
});


app.get("/:customListName", function(req, res){
  const customListName = _.lowerCase(req.params.customListName);



  List.findOne({name: customListName}).then(function(foundList){
    if(!foundList){
      const list = new List({
        name: customListName,
        items: defaultItems
      });
      list.save();
      res.redirect("/" + customListName);
    } else{
      res.render("list", {listTitle: _.startCase(_.camelCase(foundList.name)), newListItems: foundList.items});
    }
  }).catch(function(error){
    console.log(error);
  });




});



app.post("/", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  if(listName === day){
    item.save();
    res.redirect("/");
  } else{
    List.findOne({name: _.lowerCase(listName)}).then(function(foundList){
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    }).catch(function(error){
      console.log(error);
    });
  }

});


app.post("/delete", function(req, res){
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;
  
  if(listName === day){
    Item.findByIdAndDelete(checkedItemId).then(function(){
      res.redirect("/");
    }).catch(function(error){
      console.log(error);
    });
  } else {
    List.findOneAndUpdate({name: _.lowerCase(listName)}, {$pull: {items: {_id: checkedItemId}}}).then(function(foundList){
      res.redirect("/" + listName);
    }).catch(function(error){
      console.log(error);
    });
  }
  
});



app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose")
const _ = require("lodash");
const ejs = require("ejs");
const md5 = require ("md5");
const session = require('express-session');
const date = require(__dirname + "/date.js");

const app = express();

app.use(session({
  secret: 'Thisisourlittlesecret',
  resave: false,            
  saveUninitialized: true,  
  cookie: {                
    maxAge: 24 * 60 * 60 * 1000  
  }
}));

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

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  items:[itemSchema]
});

const User = mongoose.model("User", userSchema);

app.get("/", function(req, res) {
  res.render("login")
});



app.get("/register",  function(req, res){
  res.render("register");
});
  

app.get("/todo", function(req, res) {
  const userEmail = req.session.userEmail;

  if (!userEmail) {
    return res.redirect("/");  
  }


  User.findOne({ email: userEmail }).then(function(foundUser) {
    if (foundUser) {
      res.render("list", { listTitle: day, newListItems: foundUser.items });
    } else {
      res.status(404).send("User not found");
    }
  }).catch(function(error) {
    console.log(error);
  });
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

app.post("/", function(req, res) {
  const username = req.body.username;
  const password = md5(req.body.password);

  User.findOne({ email: username }).then(function(foundUser) {
    if (foundUser) {
      if (foundUser.password === password) {
        req.session.userEmail = username;  // Store user's email in session
        res.redirect("/todo");
      } else {
        res.status(401).send("Invalid password");
      }
    } else {
      res.status(404).send("User not found");
    }
  }).catch(function(error) {
    console.log(error);
  });
});



app.post("/register", function(req, res) {
  const newUser = new User({
    email: req.body.username,
    password: md5(req.body.password),
    items: []  // Initialize items as an empty array
  });

  newUser.save().then(function(savedUser) {
    savedUser.items.push(...defaultItems);
    return savedUser.save();
  }).then(function(){
    res.redirect("/");
  }).catch(function(error) {
    console.log(error);
    res.status(500).send("An error occured while registering the user.")
  });
});





app.post("/todo", function(req, res) {
  const itemName = req.body.newItem;
  const userEmail = req.session.userEmail;  // Get the logged-in user's email from session

  if (!userEmail) {
    return res.redirect("/");  // If not logged in, redirect to login
  }

  const item = new Item({
    name: itemName
  });

  // Find the user by email and add the new item to their items array
  User.findOne({ email: userEmail }).then(function(foundUser) {
    foundUser.items.push(item);
    foundUser.save().then(function() {
      res.redirect("/todo");
    });
  }).catch(function(error) {
    console.log(error);
  });
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

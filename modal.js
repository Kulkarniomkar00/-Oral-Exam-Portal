// Requiring module
const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

// Course Modal Schema
const userSchema = new mongoose.Schema({
  _id: Number,
  name: String,
  password: String,
});

// Student Modal Schema
const userDataSchema = new mongoose.Schema({
  _id: Number,
  clgName: String,
  prn: String,
  branch: String,
  name: String,
});

const teacherSchema = new mongoose.Schema({
  username: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);
teacherSchema.plugin(passportLocalMongoose);

// Creating model objects
const User = mongoose.model("user", userSchema);
const UserData = mongoose.model("userData", userDataSchema);
const Teacher = mongoose.model("teacher", teacherSchema);

// Exporting our model objects
module.exports = {
  User,
  UserData,
  Teacher,
};

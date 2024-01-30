const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const passLocalMongoose = require('passport-local-mongoose')
const passport = require('passport')

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    }
})

userSchema.plugin(passLocalMongoose);
module.exports=mongoose.model('User',userSchema)
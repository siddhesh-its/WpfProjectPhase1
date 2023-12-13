// load mongoose since we need it to define a model
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const restaurantSchema = new mongoose.Schema({
  address: {
    building: Number,
    coord: Number,
    street: String,
    zipcode: Number  
  },
  name: String,
  restaurant_id: Number,
  borough: String,
  cuisine: String,
  grades: {
    date:  Date,
    grade: String,
    score: Number}
});

module.exports = mongoose.model('Restaurant', restaurantSchema, 'restaurants');


// load mongoose since we need it to define a model
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const restaurantSchema = new mongoose.Schema({
    "address": {
      "building": {
        "type": "Date"
      },
      "coord": {
        "type": [
          "Number"
        ]
      },
      "street": {
        "type": "String"
      },
      "zipcode": {
        "type": "Date"
      }
    },
    "borough": {
      "type": "String"
    },
    "cuisine": {
      "type": "String"
    },
    "grades": {
      "type": [
        "Mixed"
      ]
    },
    "name": {
      "type": "String"
    },
    "restaurant_id": {
      "type": "String"
    }
  });

module.exports = mongoose.model('Restaurant', restaurantSchema, 'restaurants');


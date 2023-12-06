const express = require('express');
const cors = require('cors');
const path = require('path');  //me
const bcrypt = require('bcryptjs'); //me
const dotenv = require('dotenv'); //me
const mongoose = require('mongoose');
const session = require('express-session');
var bodyParser = require('body-parser');  //me

dotenv.config();  //me

const app = express();
const port = 3000;
const exphbs = require('express-handlebars');
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json

app.engine('.hbs', exphbs.engine({ extname: '.hbs',        //me
    runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  } }));
app.set('view engine', 'hbs');

// Replace these with your MongoDB Atlas connection string and database name
const connectionString = 'mongodb+srv://Harmandeep:Dhillon17@cluster0.flwyiot.mongodb.net/sample_restaurants';
//const mongoURI = 'your-mongodb-atlas-connection-string';
const dbName = 'sample_restaurants';

//me start
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: true,
}));

const { WEBUSER, WEBPASS } = process.env;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './views/index.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === WEBUSER) {
    bcrypt.compare(password, WEBPASS, (err, result) => {
      if (result) {
        req.session.authenticated = true;
        req.session.username = username; //Set the username in the session
        res.redirect('/api/restaurants');
      } else {
        res.redirect('/failure');
      }
    });
  } else {
    res.redirect('/failure');
  }
});



//me end
// Initialize MongoDB connection
const initializeMongoDB = async () => {
  try {
    await mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1); // Exit the process if MongoDB connection fails
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Restaurant model
const Restaurant = mongoose.model('restaurants', {
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

// Routes

// POST /api/restaurants
app.post('/api/restaurants', async (req, res) => {
  try {
    const newRestaurant = await Restaurant.create(req.body);
    res.status(201).json(newRestaurant);
  } catch (error) {
    console.error('Error adding new restaurant:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/restaurants
app.get('/api/restaurants', async (req, res) => {
  if (req.session.authenticated) {
  const { page, perPage, borough } = req.query;

  // Pagination
  const skip = (page - 1) * perPage;

  // Query
  const query = borough ? { borough } : {};

  try {
    const restaurants = await Restaurant.find(query)
      .skip(skip)
      .limit(parseInt(perPage))
      .exec();
      console.log(restaurants);
      //res.status(200).json(restaurants);
       res.status(200).render('res', { data: restaurants });
    ;
  } catch (error) {
    console.error('Error retrieving restaurants:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
  }
});

app.get('/api/restaurants/:id', async (req, res) => {
  if (req.session.authenticated) {
    const { id } = req.params;
  
    try {
      const restaurant = await Restaurant.findById(id).exec();
  
      if (!restaurant) {
        return res.status(404).json({ error: 'Restaurant id not found' });
      }
  
      res.status(200).render('res', { data: restaurant });
    } catch (error) {
      console.error('Error retrieving restaurant by ID:', error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
    }
  });

  // PUT /api/restaurants/:id
  app.put('/api/restaurants/:id', async (req, res) => {
    const { id } = req.params;
    const updatedRestaurantData = req.body;
  
    try {
      const restaurant = await Restaurant.findByIdAndUpdate(id, updatedRestaurantData, { new: true }).exec();
  
      if (!restaurant) {
        return res.status(404).json({ error: 'Restaurant id not found' });
      }
  
      res.status(200).json({ message: 'Restaurant updated successfully', restaurant });
    } catch (error) {
      console.error('Error updating restaurant by ID:', error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // delete 
  app.delete('/api/restaurants/:id', async function(req, res) {
    try {
        const id = req.params.id;

        // Use deleteOne to delete the document with the specified _id
        const result = await Restaurant.deleteOne({ _id: id });

        if (result.deletedCount > 0) {
            res.send('Successfully! Restaurant data has been Deleted.');
        } else {
            res.status(404).send('Restaurant data not found.');
        }
    } catch (error) {
        console.error('Error deleting Restaurant:', error);
        res.status(500).json({ error: 'Error Restaurant employee' });
    }
});

app.get('/failure', (req, res) => {
  res.send('Login Failed!');
});
  

// Start the server after initializing MongoDB
initializeMongoDB().then(() => {
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
});
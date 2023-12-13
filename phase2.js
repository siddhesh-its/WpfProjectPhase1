const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const session = require('express-session');
const connectMongo = require('connect-mongo');
const bodyParser = require('body-parser');
const initializeMongoDB = require('./config/db');
const User = require('./models/user'); 
// const graphqlHTTP = require('express-graphql');
// const buildSchema = require('graphql');

dotenv.config();

const app = express();
var port = process.env.PORT || 8000;
const exphbs = require('express-handlebars');
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
//handlebars part
app.engine('.hbs', exphbs.engine({ extname: '.hbs',        //me
    runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  } }));
app.set('view engine', 'hbs');

// Middleware
app.use(cors()); //cors is enabled for all routes
app.use(express.json());

initializeMongoDB();
// Create a new instance of MongoStore separately
const MongoStore = connectMongo(session);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
  })
);

const { WEBUSER, WEBPASS } = process.env;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './views/index.html'));
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Query the user from the MongoDB database based on the username
    const user = await User.findOne({ username });

    if (user) {
      // Compare the provided password with the hashed password from the database
      bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
          req.session.authenticated = true;
          req.session.username = username;
          res.redirect('/restaurants');
        } else {
          res.redirect('/failure');
        }
      });
    } else {
      // User not found in the database
      res.redirect('/failure');
    }
  } catch (error) {
    console.error('Error authenticating user:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/register', (req, res) => {
  res.render('register'); // render the register.hbs file
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ username, password: hashedPassword });

    // Optionally, you can set the user as authenticated in the session
    req.session.authenticated = true;
    req.session.username = username;

    res.redirect('/restaurants');
  } catch (error) {
    console.error('Error registering user:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Restaurant model
const Restaurant = require('./models/restaurants');

// POST /api/restaurants
app.post('/api/restaurants', async (req, res) => {
  if (req.session.authenticated) {
  try {
    const newRestaurant = await Restaurant.create(req.body);
    res.status(201).json(newRestaurant);
  } catch (error) {
    console.error('Error adding new restaurant:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
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

//home
app.get('/restaurants', async (req, res) => {
  // if (req.session.authenticated) {
    const { page, perPage = 5, borough } = req.query;

    // Pagination
    const skip = (page - 1) * perPage;

    // Query
    const query = borough ? { borough } : {};

    try {
      const restaurants = await Restaurant.find(query)
        .skip(skip)
        .limit(parseInt(perPage))
        .exec();

      const totalRestaurants = await Restaurant.countDocuments(query);
      const totalPages = Math.ceil(totalRestaurants / perPage);

      res.render('res', {
        data: restaurants,
        totalPages: totalPages,
        currentPage: page,
        perPage: perPage,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page < totalPages ? parseInt(page) + 1 : totalPages,
        prevPage: page > 1 ? page - 1 : 1,
      });
    } catch (error) {
      console.error('Error retrieving restaurants:', error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

//extra functionality
app.route('/restaurants/cuisine')
  .get((req, res) => {
    if (req.session.authenticated) {
      res.render('cuisineForm'); 
    }
  })
  .post(async (req, res) => {
    if (req.session.authenticated) {
      const { cuisine } = req.body;

      try {
        //RegularExpression is used for case-sensitivity and partial matching
        const restaurants = await Restaurant.find({ cuisine: { $regex: new RegExp(cuisine, 'i') } }).exec();

        if (!restaurants || restaurants.length === 0) {
          return res.status(404).render('res', { error: 'Restaurants with the given cuisine not found' });
        }

        res.status(200).render('res', { data: restaurants });
      } catch (error) {
        console.error('Error retrieving restaurants by cuisine:', error.message);
        res.status(500).render('res', { error: 'Internal Server Error' });
      }
    }
  });

//search by ID in UI
app.route('/restaurants/searchById')
  .get((req, res) => {
    if (req.session.authenticated) {
      res.render('searchByIdForm'); 
    }
  })
  .post(async (req, res) => {
    if (req.session.authenticated) {
      const { id } = req.body;

      try {
        
        const restaurants = await Restaurant.findById(id).exec();

        if (!restaurants || restaurants.length === 0) {
          return res.status(404).render('res', { error: 'Restaurants with the given ID not found' });
        }

        res.status(200).render('res', { data: restaurants });
      } catch (error) {
        console.error('Error retrieving restaurants by ID:', error.message);
        res.status(500).render('res', { error: 'Internal Server Error' });
      }
    }
  });

//search by ID functionality
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

app.all("*", (req,res) =>{
    res.status(404).send("Error 404: page not found");
});

//graphiqlpart
// const schemaString = `
//   type Address {
//     building: String
//     coord: [Float]
//     street: String
//     zipcode: String
//   }

//   type Grade {
//     date: String
//     grade: String
//     score: Int
//   }

//   type Restaurant {
//     _id: ID
//     address: Address
//     borough: String
//     cuisine: String
//     grades: [Grade]
//     name: String
//     restaurant_id: String
//   }

//   type Query {
//     restaurants(page: Int, perPage: Int, borough: String): [Restaurant]
//     restaurant(id: ID!): Restaurant
//   }

//   type Mutation {
//     addRestaurant(input: RestaurantInput): Restaurant
//     updateRestaurant(id: ID!, input: RestaurantInput): Restaurant
//     deleteRestaurant(id: ID!): String
//   }

//   input RestaurantInput {
//     address: AddressInput
//     borough: String
//     cuisine: String
//     grades: [GradeInput]
//     name: String
//     restaurant_id: String
//   }

//   input AddressInput {
//     building: String
//     coord: [Float]
//     street: String
//     zipcode: String
//   }

//   input GradeInput {
//     date: String
//     grade: String
//     score: Int
//   }
// `;

// const schema = buildSchema(schemaString);
// const root = {
//   restaurants: async ({ page, perPage, borough }) => {
//     try {
//       const query = borough ? { borough } : {};

//       const restaurants = await Restaurant.find(query)
//         .skip((page - 1) * perPage)
//         .limit(perPage)
//         .exec();

//       return restaurants;
//     } catch (error) {
//       console.error('Error fetching restaurants:', error.message);
//       throw new Error('Internal Server Error');
//     }
//   },
//   restaurant: async ({ id }) => {
//     try {
//       const restaurant = await Restaurant.findById(id).exec();

//       if (!restaurant) {
//         throw new Error('Restaurant not found');
//       }

//       return restaurant;
//     } catch (error) {
//       console.error('Error fetching restaurant:', error.message);
//       throw new Error('Internal Server Error');
//     }
//   },
//   addRestaurant: async ({ input }) => {
//     try {
//       const newRestaurant = await Restaurant.create(input);
//       return newRestaurant;
//     } catch (error) {
//       console.error('Error adding new restaurant:', error.message);
//       throw new Error('Internal Server Error');
//     }
//   },
//   updateRestaurant: async ({ id, input }) => {
//     try {
//       const updatedRestaurant = await Restaurant.findByIdAndUpdate(id, input, { new: true }).exec();

//       if (!updatedRestaurant) {
//         throw new Error('Restaurant not found');
//       }

//       return updatedRestaurant;
//     } catch (error) {
//       console.error('Error updating restaurant:', error.message);
//       throw new Error('Internal Server Error');
//     }
//   },
//   deleteRestaurant: async ({ id }) => {
//     try {
//       const result = await Restaurant.findByIdAndDelete(id).exec();

//       if (!result) {
//         throw new Error('Restaurant not found');
//       }

//       return 'Restaurant deleted successfully';
//     } catch (error) {
//       console.error('Error deleting restaurant:', error.message);
//       throw new Error('Internal Server Error');
//     }
//   },
// };

// app.use(
//   '/graphql',
//   graphqlHTTP((req, res) => ({
//     schema: schema,
//     rootValue: root,
//     graphiql: true, // Enable GraphiQL for development
//     context: { req, res }, // Pass the request and response objects to context for authentication
//   }))
// );
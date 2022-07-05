require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const sql = require('./database/mysql');
sql.connect();
//firebase
const admin = require('firebase-admin');
admin.initializeApp();

//routes
const { AdminRoute, StaffRoute, StudentRoute, NoApiRoute, ErrorRoute } = require('./routes');
app.use('/admin', AdminRoute);
app.use('/staff', StaffRoute);
app.use('/student', StudentRoute);

app.use(NoApiRoute);
app.use(ErrorRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started @ ${PORT}`);
});
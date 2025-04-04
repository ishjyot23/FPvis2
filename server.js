const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors()); // Allow frontend to communicate
app.use(bodyParser.urlencoded({ extended: true })); // Parse form data
app.use(bodyParser.json()); // Parse JSON data

// Connect to SQLite3 database
const db = new sqlite3.Database("gyanMargDB.db", sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

// API to handle user signup
app.post("/signup", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const checkQuery = "SELECT email FROM user WHERE email = ?";
  db.get(checkQuery, [email], (err, row) => {
    if (err) {
      console.error("Error checking email:", err.message);
      return res.status(500).json({ error: "Database error" });
    }
    if (row) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Insert user if email is not found
    const insertQuery = "INSERT INTO user (email, name, password) VALUES (?, ?, ?)";
    db.run(insertQuery, [email, name, password], function (err) {
      if (err) {
        console.error("Error inserting user:", err.message);
        return res.status(500).json({ error: "Database error" });
      }
      res.status(201).json({ message: "Signup successful!" });
    });
  });
});

// API to handle user signin
app.post("/signin", (req, res) => {
  const { email, password } = req.body;

  console.log("Sign-in attempt for:", email);

  if (!email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const query = "SELECT email, name, password FROM user WHERE email = ?";
  db.get(query, [email], (err, row) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    if (!row) {
      console.log("No user found with email:", email);
      return res.status(400).json({ error: "Invalid email or password" });
    }

    if (row.password !== password) {
      console.log("Incorrect password for:", email);
      return res.status(400).json({ error: "Invalid email or password" });
    }

    console.log("Signin successful for:", email);
    res.status(200).json({ message: "Signin successful!", name: row.name, email: row.email });
  });
});



// API to get volunteer count
app.get("/getVolunteerCount", (req, res) => {
  db.all("SELECT email, role FROM user", [], (err, rows) => {
    if (err) {
      console.error("SQL Error:", err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    

    db.get("SELECT COUNT(*) AS count FROM user WHERE role = 'volunteer'", [], (err, row) => {
      if (err) {
        console.error("❌ Count Error:", err.message);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ count: row.count || 0 });
    });
  });
});
// API to get volunteer count
app.get("/getCenterCount", (req, res) => {
    

    db.get("SELECT COUNT(*) AS count FROM verification where status=1", [], (err, row) => {
      if (err) {
        console.error("❌ Count Error:", err.message);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ count: row.count || 0 });
    });
  });


// API for sessions details
app.post("/sessions", (req, res) => {
  const { email } = req.body;

  if (!email) {
    console.log("❌ No email provided");
    return res.status(400).json({ error: "Email is required" });
  }

  console.log("📩 Received request for email:", email);

  const query = `
    SELECT subjects, date_session, class_level, center_name 
    FROM session 
    WHERE volunteer_email = ?
  `;

  db.all(query, [email], (err, rows) => {
    if (err) {
      console.error("❌ Database error:", err.message);
      return res.status(500).json({ error: "Failed to retrieve sessions" });
    }

    console.log("📋 Query result:", rows);

    if (!rows || rows.length === 0) {
      console.log("⚠️ No sessions found for:", email);
      return res.json([]); // Return an empty array instead of undefined
    }

    res.json(rows);
  });
});

// Start the server on port 3000
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});

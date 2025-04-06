const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors()); // Allow frontend to communicate
app.use(bodyParser.urlencoded({ extended: true })); // Parse form data
app.use(bodyParser.json()); // Parse JSON data

// Serve frontend files from root (IMPORTANT FOR DEPLOYMENT)
app.use(express.static(__dirname));

// Optional: serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

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
  const { name, email,phone, password } = req.body;

  if (!name || !email || !phone ||!password) {
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
    const insertQuery = "INSERT INTO user (email, name, phone, password) VALUES (?, ?, ?, ?)";
    db.run(insertQuery, [email, name, phone, password], function (err) {
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

// API to handle center registeration
app.post("/register", (req, res) => {
  const { email, password, phone, center_name, centerAdd, regNo } = req.body;

  console.log("Register attempt for:", email);

  if (!email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const query = "SELECT email, password FROM user WHERE email = ?";
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

    // Update center details in that row if email is found
const updateQuery = `
UPDATE user 
SET phone = ?, center_name = ?, centerAdd = ?, regNo = ?, role = 'center'
WHERE email = ?
`;

db.run(updateQuery, [phone, center_name, centerAdd, regNo, email], function (err) {
if (err) {
  console.error("Error updating user:", err.message);
  return res.status(500).json({ error: "Database error" });
}

// Now insert into verification table
const insertQuery = `
  INSERT INTO verification (center_email) VALUES (?)
`;

db.run(insertQuery, [email], function (err) {
  if (err) {
    console.error("Error inserting into verification:", err.message);
    return res.status(500).json({ error: "Database error" });
  }

  // Send final response after both operations succeed
  res.status(201).json({ message: "Registration successful!" });
});
});
  });
});

// API to get available sessions
app.get("/available-sessions", (req, res) => {
  const query = "SELECT * FROM session WHERE status = 'available'";
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error fetching available sessions:", err.message);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json(rows);
    }
  });
});

// POST to update session status
app.post("/update-session", (req, res) => {
  const { session_id, action, user_email } = req.body;

  if (!session_id || !action || !user_email) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const newStatus = action === "join" ? "booked" : "available";
  const volunteer = action === "join" ? user_email : null;

  const query = `UPDATE session SET status = ?, volunteer_email = ? WHERE id = ?`;

  db.run(query, [newStatus, volunteer, session_id], function (err) {
    if (err) {
      console.error("Error updating session:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    res.json({ success: true, message: "Session updated successfully" });
  });
});

// API for created sessions
app.post('/createdSessions', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send("Missing required email");
  }

  try {
    const query = `
      SELECT * FROM session
      WHERE center_email = ?;
    `;
    db.all(query, [email], (err, rows) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).send("Server error");
      }
      res.json(rows);
    });
  } catch (error) {
    console.error("Error fetching created sessions:", error);
    res.status(500).send("Server error");
  }
});

// API create session
app.post("/createSession", (req, res) => {
  const { center_email, subjects, class_level, date_session, timings } = req.body;

  if (!center_email || !subjects || !class_level || !date_session || !timings) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // Step 1: Check verification
  db.get("SELECT * FROM verification WHERE center_email = ?", [center_email], (err, verification) => {
    if (err) {
      console.error("Verification lookup error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    if (!verification) {
      return res.status(400).json({ error: "Register your center first using this email." });
    }

    if (!verification.status) {
      return res.status(400).json({ error: "Your center is not verified yet! You will receive an email if it's verified." });
    }

    // Step 2: Get center_name from user table
    db.get("SELECT center_name FROM user WHERE email = ?", [center_email], (err, user) => {
      if (err) {
        console.error("User lookup error:", err.message);
        return res.status(500).json({ error: "Database error" });
      }

      if (!user) {
        return res.status(400).json({ error: "User not found with this email." });
      }

      const center_name = user.center_name;

      // Step 3: Insert session
      const insertQuery = `
        INSERT INTO session (center_email, subjects, class_level, date_session, timings, center_name, status)
        VALUES (?, ?, ?, ?, ?, ?, 'available')
      `;

      db.run(insertQuery, [center_email, subjects, class_level, date_session, timings, center_name], function (err) {
        if (err) {
          console.error("Insert session error:", err.message);
          return res.status(500).json({ error: "Could not create session" });
        }

        res.status(201).json({ message: "Session created successfully!" });
      });
    });
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
    

    db.get("SELECT COUNT(DISTINCT volunteer_email) AS count FROM session", [], (err, row) => {
      if (err) {
        console.error("❌ Count Error:", err.message);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ count: row.count || 0 });
    });
  });
});
// API to get center count
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
    SELECT subjects, date_session, class_level, center_name, center_email 
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

// Get list of all verified centers
app.get("/verified-centers", (req, res) => {
  const query = `
    SELECT u.center_name, u.email, u.phone, u.regNo, u.centerAdd
    FROM user u
    JOIN verification v ON u.email = v.center_email
    WHERE u.role = 'center' AND v.status = 1
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error fetching verified centers:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(rows);
  });
});
app.post("/verify", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const query = "SELECT * FROM verification WHERE center_email = ?";
  db.get(query, [email], (err, row) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    if (!row) {
      return res.status(404).json({ verified: false, message: "Email not registered in verification table" });
    }

    return res.status(200).json({
      verified: !!row.status,
      message: row.status ? "Center is verified" : "Center is not verified yet"
    });
  });
});



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

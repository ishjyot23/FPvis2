const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const crypto = require("crypto"); // For unique token

const app = express();
const cors = require("cors");

app.use(cors({
  origin: "https://vidishakataria0602.github.io", // your GitHub Pages site
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(cors());
app.use(express.json()); // parses incoming JSON

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
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
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

    // Step 1: Generate token and save it in memory
    const token = crypto.randomBytes(32).toString("hex");
    verificationTokens.set(token, { name, email, phone, password });

    // Step 2: Send email with verification link
    const transporter = nodemailer.createTransport({
      service: "gmail", // or another email service
      auth: {
        user: "ishjyot@gmail.com",
        pass: "cxdh pqdo nlfe xydu", // use an app password, not your main password
      },
    });

    const verificationLink = `https://fpvis2.onrender.com/verify-email?token=${token}`;
    const mailOptions = {
      from: '"GyanMarg" <ishjyot@gmail.com>',
      to: email,
      subject: "Verify your email for GyanMarg",
      html: `<p>Hello ${name},</p><p>Click the link below to verify your email and complete signup:</p><a href="${verificationLink}">${verificationLink}</a>`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending email:", err.message);
        return res.status(500).json({ error: "Failed to send verification email" });
      }

      res.status(200).json({ message: "Verification email sent. Please check your inbox." });
    });
  });
});
app.get("/verify-email", (req, res) => {
  const { token } = req.query;

  if (!token || !verificationTokens.has(token)) {
    return res.status(400).send("Invalid or expired verification link.");
  }

  const { name, email, phone, password } = verificationTokens.get(token);

  const insertQuery = "INSERT INTO user (email, name, phone, password) VALUES (?, ?, ?, ?)";
  db.run(insertQuery, [email, name, phone, password], function (err) {
    if (err) {
      console.error("Error inserting user:", err.message);
      return res.status(500).send("Database error while verifying email.");
    }

    verificationTokens.delete(token);
    res.send(`<h2>Email verified successfully! You can now <a href="/">sign in</a>.</h2>`);
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

// POST to update session status (for joining a session)
app.post("/update-session", (req, res) => {
  const { session_id, action, user_email } = req.body;

  if (!session_id || !action || !user_email) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const newStatus = action === "join" ? "booked" : "available";
  const volunteer = action === "join" ? user_email : null;

  // First, fetch the session details to include in the email
  const query = `SELECT * FROM session WHERE id = ?`;
  db.get(query, [session_id], (err, session) => {
    if (err) {
      console.error("Error fetching session:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Update session status and volunteer email
    const updateQuery = `UPDATE session SET status = ?, volunteer_email = ? WHERE id = ?`;
    db.run(updateQuery, [newStatus, volunteer, session_id], function (err) {
      if (err) {
        console.error("Error updating session:", err.message);
        return res.status(500).json({ success: false, message: "Database error" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: "Session not found" });
      }

      // Construct the email content
      const transporter = nodemailer.createTransport({
        service: "gmail", // or another email service
        auth: {
          user: "ishjyot@gmail.com",
          pass: "cxdh pqdo nlfe xydu", // Ensure you're using an app password
        },
      });

      const mailOptions = {
        from: '"GyanMarg" <ishjyot@gmail.com>',
        to: user_email,
        subject: "You have successfully joined a session!",
        html: `
          <p>Hello,</p>
          <p>You have successfully joined the following session:</p>
          <p><strong>Session Name:</strong> ${session.subjects}</p>
          <p><strong>Class Level:</strong> ${session.class_level}</p>
          <p><strong>Date:</strong> ${session.date_session}</p>
          <p><strong>Time:</strong> ${session.timings}</p>
          <p>Thank you for your participation!</p>
        `,
      };

      // Send email notification
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error("Error sending email:", err.message);
          return res.status(500).json({ success: false, message: "Failed to send notification email" });
        }

        res.json({
          success: true,
          message: "Session updated successfully and notification email sent",
        });
      });
    });
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

  const query = "UPDATE verification SET status = 1 WHERE center_email = ?";
  db.run(query, [email], function (err) {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: "Email not found" });
    }

    return res.status(200).json({ message: "Verification status updated to true" });
  });
});



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

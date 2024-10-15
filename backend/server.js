import express from 'express';
import mysql from 'mysql';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import fs from 'fs/promises'; // Use the promise-based version of fs
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import multer from 'multer';

const app = express();
const PORT = 8081;

// Allow cross-origin requests from the frontend app
app.use(cors({
  origin: 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true
}));

// Create a connection to the database
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "project",
  port: "3307"
});

app.use(cookieParser());
app.use(express.json(({ type: 'application/json; charset=utf-8' })));
app.use(express.urlencoded({ extended: true, type: 'application/x-www-form-urlencoded; charset=utf-8' }));
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectDir = path.resolve(__dirname, '..', 'frontend', 'src', 'Music');
const filePath = path.join(projectDir, '..', '..', '..', 'MusicData.txt');
const filePath2 = path.join(projectDir, '..', '..', '..', 'MusicPath.txt');


// Sign-up route for new users
app.post('/signup', (req, res) => {
  console.log("Received data:", req.body);
  const sql = "INSERT INTO login (name, email, password) VALUES (?)";
  bcrypt.hash(req.body.password.toString(), 10, (err, hash) => {
    if (err) return res.json({ Error: "Error hashing password" });
    const values = [
      req.body.name,
      req.body.email,
      hash
    ];
    db.query(sql, [values], (err, result) => {
      if (err) { return res.json({ Error: "Error inserting data" }); }
      return res.json({ Status: "Success" });
    });
  });
});

const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.json("Access Denied");
  jwt.verify(token, 'jwt-token-project-key', (err, decoded) => {
    if (err) return res.json({ Error: "Token is invalid" });
    req.name = decoded.name;
    next();
  });
};

app.get('/', verifyUser, (req, res) => {
  return res.json({ Status: "Success", name: req.name });
});

app.post('/login', (req, res) => {
  console.log("Received data:", req.body);
  const sql = "SELECT * FROM login WHERE email = ?";

  db.query(sql, [req.body.email], (err, data) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      return res.json({ Error: "Error executing SQL query" });
    }
    if (data.length > 0) {
      bcrypt.compare(req.body.password, data[0].password, (error, result) => {
        if (error) return res.json({ Error: "Error executing SQL query" });
        if (result) {
          const name = data[0].name;
          const token = jwt.sign({ name }, 'jwt-token-project-key', { expiresIn: '2h' });
          res.cookie('token', token);
          return res.json({ Status: "Success" });

        } else {
          return res.json("Password incorrect");
        }
      });
    } else {
      return res.json("Fail");
    }
  });
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ Status: "Success" });
});

// Ensure the upload directory exists
await fs.mkdir(projectDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, projectDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.originalname}`);
  }
});

  const upload = multer({ storage }); 

app.post('/add', upload.single('file'), async (req, res) => {
  const { title, path, tags } = req.body;
  const newEntry = {
    title,
    path: path,
    tags: JSON.parse(tags)
  };

  try {
    let importPath = `import ${path} from '../Music/${req.file.originalname}';\n`;

    // Read the existing data from the txt file
    const data = await fs.readFile(filePath, 'utf8');
    let musicData = JSON.parse(data);

    // Append the new entry to the array
    musicData.push(newEntry);

    let newData = JSON.stringify(musicData, null, 2);

    // Write the updated data back to the file
    await fs.writeFile(filePath, newData);
    await fs.appendFile(filePath2, importPath);
    res.status(200).json({ message: 'Data added successfully!' });
    console.log(projectDir, filePath, newEntry, musicData);
  } catch (error) {
    console.error('Error writing to file:', error);
    res.status(500).json({ error: 'Failed to add data' });
  }
});


app.post('/export', async (req, res) => {
  const { title, path, tags } = req.body;
  const dataToWrite = `title: ${title}, tath: ${path}, tags: ${tags.join(', ')}\n`;

  try {
    await fs.writeFile(filePath, dataToWrite);
    res.status(200).json({ message: 'Data exported successfully!' });
  } catch (error) {
    console.error('Error writing to file:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import "dotenv/config";
import express from "express";
import pg from "pg";

const { Pool } = pg;

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});


const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Listening on ${port}`);
});

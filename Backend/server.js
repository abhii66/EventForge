import exp from "express";
import { config } from "dotenv";
import { connect } from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import {userApp} from './APIs/UserAPI.js'
//import {eventApp} from './APIs/EventAPI.js'

config();
const app = exp();

app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = ["http://localhost:5173"];
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(exp.json());
app.use(cookieParser());
app.use('/user-api', userApp)
// app.use('/event-api', eventApp)

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT;

async function connectDB() {
  try {
    await connect(process.env.DB_URL);
    console.log("DB connection success.");

    app.listen(port, () => console.log(`server on port ${port}...`));
  } catch (err) {
    console.log("Error in DB connection", err);
  }
}
connectDB();

//to handle invalid path
app.use((req, res, next) => {
  console.log(req.url);
  res.status(404).json({ message: `path ${req.url} is invalid` });
});

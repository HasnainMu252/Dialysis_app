import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { connectDB } from "./config/db.js";
import { startInsuranceExpiryJob } from "./jobs/insuranceExpiryJob.js";

const port = process.env.PORT || 5000;

connectDB()
  .then(() => {
    startInsuranceExpiryJob();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Database Connection Error:", err);
    process.exit(1);
  });
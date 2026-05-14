import express from "express";
import cors from "cors";

import Hello from "./Hello.js";
import saraRoutes from "./spotTheLie/saraRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

Hello(app);
saraRoutes(app);

app.listen(process.env.PORT || 4000);

import express from "express";
import cors from "cors";

import Hello from "./Hello.js";
import saraRoutes from "./spotTheLie/saraRoutes.js";
import reviewRoutes from "./spotTheLie/reviewRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

Hello(app);
saraRoutes(app);
reviewRoutes(app);

app.listen(process.env.PORT || 4000);

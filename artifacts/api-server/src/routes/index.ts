import { Router, type IRouter } from "express";
import healthRouter from "./health";
import fbRouter from "./fb.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/fb", fbRouter);

export default router;

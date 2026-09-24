import type { Request, Response } from "express";
import { app } from "../../server";

export default function handler(req: Request, res: Response) {
  if (!req.url || req.url === "/" || !req.url.startsWith("/api/")) {
    req.url = "/api/ai/business" + (req.url && req.url !== "/" ? req.url : "");
  }
  return app(req, res);
}

import express from "express";
import cors from "cors";

const server = express();

server.use(cors());

server.listen(5000, () => {
  console.log("Servidor rodando!");
});

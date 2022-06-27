import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

const server = express();
server.use(cors());
server.use(express.json());
dotenv.config();

let db;
const client = new MongoClient(process.env.MONGO_URL);

client.connect().then(() => {
  db = client.db("uol");
});

server.post("/participants", async (req, res) => {
  const participant = req.body;
  const participantSchema = joi.object({
    name: joi.string().min(1).required(),
  });
  const { error } = participantSchema.validate(participant);
  if (error) {
    res.status(422).send("Insira um nome válido.");
    return;
  }
  try {
    const exist = await db
      .collection("participants")
      .findOne({ name: participant.name });
    if (exist) {
      res.status(409).send();
      return;
    }
    await db
      .collection("participants")
      .insertOne({ name: participant.name, lastStatus: Date.now() });
    await db.collection("messages").insertOne({
      from: participant.name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().locale("pt-br").format("HH:mm:ss"),
    });
    res.status(201).send();
  } catch (err) {
    res.status(500).send(err);
    return;
  }
});

server.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find({}).toArray();
    res.send(participants);
  } catch (err) {
    res.status(500).send(err);
    return;
  }
});

server.get("/messages", async (req, res) => {
  const limit = parseInt(req.query.limit);
  const { user } = req.headers;

  try {
    const messages = await db.collection("messages").find({}).toArray();
    const x = messages.filter((message) => {
      if (
        message.to === "Todos" ||
        message.to === user ||
        message.from === user ||
        message.type === "message"
      ) {
        return true;
      }
    });
    if (limit) {
      res.send(x.slice(-limit));
      return;
    }
    res.send(x);
  } catch (err) {
    res.status(500).send();
  }
});

server.post("/messages", async (req, res) => {
  const message = req.body;
  const { user } = req.headers;
  const messageSchema = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.string().valid("message", "private_message").required(),
  });
  const { error } = messageSchema.validate(message, { abortEarly: false });
  if (error) {
    const err = error.details.map((detail) => detail.message);
    res.status(422).send(err);
  }

  try {
    const participant = await db
      .collection("participants")
      .findOne({ name: user });
    if (!participant) {
      res.status(422).send();
      return;
    }

    await db.collection("messages").insertOne({
      from: user,
      to: message.to,
      text: message.text,
      type: message.type,
      time: dayjs().locale("pt-br").format("HH:mm:ss"),
    });

    res.status(201).send();
  } catch (e) {
    res.status(422).send();
    return;
  }
});

server.listen(5000, () => {
  console.log("Servidor rodando!");
});

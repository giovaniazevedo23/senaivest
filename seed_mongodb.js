require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Erro: Você precisa definir a variável MONGODB_URI no arquivo .env");
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, 'data');

const DB_FILES = {
  inventory: path.join(DATA_DIR, 'inventory.json'),
  plans: path.join(DATA_DIR, 'plans.json'),
  boletins: path.join(DATA_DIR, 'boletins.json'),
  notifications: path.join(DATA_DIR, 'notifications.json'),
  schools: path.join(DATA_DIR, 'schools.json'),
  labs: path.join(DATA_DIR, 'labs.json'),
  users: path.join(DATA_DIR, 'users.json'),
  posts: path.join(DATA_DIR, 'posts.json'),
  agenda: path.join(DATA_DIR, 'agenda.json'),
  news: path.join(DATA_DIR, 'news.json'),
  diario: path.join(DATA_DIR, 'diario.json'),
  categories: path.join(DATA_DIR, 'categories.json'),
  deletedCategories: path.join(DATA_DIR, 'deletedCategories.json'),
  presence: path.join(DATA_DIR, 'presence.json'),
  appStats: path.join(DATA_DIR, 'appStats.json'),
};

async function seed() {
  console.log("Conectando ao MongoDB Atlas...");
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('senaivest');
  console.log("✅ Conectado!");

  for (const [key, file] of Object.entries(DB_FILES)) {
    if (fs.existsSync(file)) {
      try {
        const raw = fs.readFileSync(file, 'utf8').trim();
        if (raw) {
          const parsed = JSON.parse(raw);
          console.log(`Subindo os dados de ${key}...`);
          const collection = db.collection('data_' + key);
          await collection.updateOne(
            { _id: 'singleton' },
            { $set: { data: parsed } },
            { upsert: true }
          );
        }
      } catch (e) {
        console.error(`Erro ao processar ${key}:`, e.message);
      }
    }
  }

  console.log("🚀 Migração concluída com sucesso!");
  await client.close();
  process.exit(0);
}

seed();

const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://giovaniazevedo06_db_user:KOmQQPnQXwHsj9iL@cluster0.0sotfpr.mongodb.net/senaivest?retryWrites=true&w=majority";

async function run() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('senaivest');
        const collection = db.collection('appdata');
        const doc = await collection.findOne({ _type: 'schools' });
        console.log("DB Schools:", JSON.stringify(doc ? doc.data : [], null, 2));
    } finally {
        await client.close();
    }
}
run().catch(console.dir);

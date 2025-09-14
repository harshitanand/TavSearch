db = db.getSiblingDB('market_intelligence');

// Create collections
db.createCollection('users');
db.createCollection('queries');
db.createCollection('results');

// Create indexes for better performance
db.users.createIndex({ "userId": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });

db.queries.createIndex({ "userId": 1, "createdAt": -1 });
db.queries.createIndex({ "status": 1 });
db.queries.createIndex({ "queryText": "text" });

db.results.createIndex({ "queryId": 1 });
db.results.createIndex({ "createdAt": -1 });

// Insert initial admin user
db.users.insertOne({
  userId: "admin",
  email: "admin@marketintel.com",
  name: "System Administrator",
  role: "admin",
  subscription: {
    plan: "enterprise",
    status: "active"
  },
  settings: {
    maxConcurrentAnalyses: 10,
    defaultExportFormat: "pdf",
    emailNotifications: true
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

print("MongoDB initialization completed successfully!");

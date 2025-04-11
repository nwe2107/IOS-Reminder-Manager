// src/database.js
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin
let db;

const initializeDb = () => {
  if (!db) {
    try {
      let credential;
      
      // Check if running in production (Cloud Run)
      if (process.env.NODE_ENV === 'production') {
        console.log('Running in production mode - using environment credentials');
        
        // In production, use mounted secret or environment variable
        // This path will be mounted from Secret Manager in Cloud Run
        const secretPath = '/secrets/FIREBASE_CONFIG';        
        if (fs.existsSync(secretPath)) {
          console.log('Using mounted service account from secret');
          const serviceAccountContent = fs.readFileSync(secretPath, 'utf8');
          const serviceAccount = JSON.parse(serviceAccountContent);
          credential = admin.credential.cert(serviceAccount);
        } else {
          // Fallback to environment variable if available
          console.log('Secret mount not found, checking for environment variable');
          if (process.env.FIREBASE_CONFIG) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
            credential = admin.credential.cert(serviceAccount);
          } else {
            throw new Error('No Firebase credentials found in production environment');
          }
        }
      } else {
        // Development mode - use local service account file
        console.log('Running in development mode - using local service account file');
        const keyFilePath = path.resolve(process.cwd(), 'serviceAccountKey.json');
        console.log('Looking for service account key at:', keyFilePath);
        
        // Check if the file exists
        if (!fs.existsSync(keyFilePath)) {
          console.error(`Service account key file not found at: ${keyFilePath}`);
          process.exit(1);
        }
        
        // Read and parse the key file manually to avoid require cache issues
        const serviceAccountContent = fs.readFileSync(keyFilePath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountContent);
        credential = admin.credential.cert(serviceAccount);
        
        // Log project information for debugging
        console.log(`Initializing Firestore with project ID: ${serviceAccount.project_id}`);
      }
      
      // Initialize Firebase app
      admin.initializeApp({
        credential: credential
      });
      
      db = admin.firestore();
      
      // Test database connection
      console.log('Testing Firestore connection...');
      return db.collection('test').doc('connection-test').get()
        .then(() => {
          console.log('✅ Firestore connection successful!');
          return db;
        })
        .catch((error) => {
          console.error('❌ Firestore connection failed:', error);
          process.exit(1);
        });
    } catch (error) {
      console.error('Error initializing Firestore:', error);
      process.exit(1);
    }
  }
  return Promise.resolve(db);
};

// Modified to handle async initialization
export default {
  getDb: async () => {
    if (!db) {
      return await initializeDb();
    }
    return db;
  },

  // Helper methods for common database operations
  async createDocument(collection, data) {
    try {
      const db = await this.getDb();
      const docRef = db.collection(collection).doc();
      const id = docRef.id;
      
      await docRef.set({
        ...data,
        id,
        created_at: new Date().toISOString()
      });
      
      return { id, ...data, created_at: new Date().toISOString() };
    } catch (error) {
      console.error(`Error creating document in ${collection}:`, error);
      throw error; // Re-throw to be caught by the route handler
    }
  },

  async getDocument(collection, id) {
    try {
      const db = await this.getDb();
      const doc = await db.collection(collection).doc(id).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return doc.data();
    } catch (error) {
      console.error(`Error getting document in ${collection}:`, error);
      throw error; // Re-throw to be caught by the route handler
    }
  },
  
  async updateDocument(collection, id, data) {
    try {
      const db = await this.getDb();
      const docRef = db.collection(collection).doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      const updatedData = {
        ...data,
        updated_at: new Date().toISOString()
      };
      
      await docRef.update(updatedData);
      
      return { id, ...doc.data(), ...updatedData };
    } catch (error) {
      console.error(`Error updating document in ${collection}:`, error);
      throw error; // Re-throw to be caught by the route handler
    }
  },
  
  async deleteDocument(collection, id) {
    try {
      const db = await this.getDb();
      const docRef = db.collection(collection).doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      await docRef.delete();
      
      return { id };
    } catch (error) {
      console.error(`Error deleting document in ${collection}:`, error);
      throw error; // Re-throw to be caught by the route handler
    }
  },
  
  async getAllDocuments(collection, whereConditions = [], orderBy = [], limit = null) {
    try {
      const db = await this.getDb();
      let query = db.collection(collection);
  
      for (const condition of whereConditions) {
        query = query.where(condition.field, condition.operator, condition.value);
      }
  
      for (const order of orderBy) {
        query = query.orderBy(order.field, order.direction);
      }
  
      if (limit !== null) {
        query = query.limit(limit);
      }
  
      const snapshot = await query.get();
      const results = [];
  
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() });
      });
  
      return results;
    } catch (error) {
      console.error(`Error getting documents from ${collection}:`, error);
      throw error;
    }
  }
};
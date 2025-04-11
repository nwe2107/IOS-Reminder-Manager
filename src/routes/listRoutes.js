import express from 'express';
import database from '../database.js';
const router = express.Router();


// Get all reminder lists
router.get('/', async (req, res) => {
  try {
    const lists = await database.getAllDocuments('lists');
    res.json(lists);
  } catch (error) {
    console.error('Error getting lists:', error);
    res.status(500).json({ error: 'Failed to get lists' });
  }
});

// Get a specific list by ID
router.get('/:id', async (req, res) => {
  try {
    const list = await database.getDocument('lists', req.params.id);
    
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    res.json(list);
  } catch (error) {
    console.error('Error getting list:', error);
    res.status(500).json({ error: 'Failed to get list' });
  }
});

// Create a new list
router.post('/', async (req, res) => {
  try {
    const { name, category } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const listData = {
      name,
      category: category || 'Default'
    };
    
    const newList = await database.createDocument('lists', listData);
    res.status(201).json(newList);
  } catch (error) {
    console.error('Error creating list:', error);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// Get all reminders in a specific list
router.get('/:id/reminders', async (req, res) => {
  try {
    // First, verify the list exists
    const list = await database.getDocument('lists', req.params.id);
    
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    const reminders = await database.getAllDocuments('reminders', [
      {
        field: 'list_name',
        operator: '==',
        value: list.name
      },
      {
        field: 'is_active',
        operator: '==',
        value: true
      }
    ]);
    
    res.json(reminders);
  } catch (error) {
    console.error('Error getting reminders by list:', error);
    res.status(500).json({ error: 'Failed to get reminders by list' });
  }
});

export default router;
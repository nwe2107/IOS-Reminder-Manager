import express from 'express';
import database from '../database.js';
import { apiKeyAuth } from '../middleware/auth.js';
const router = express.Router();

// Get all reminders
router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    let whereConditions = [];
    
    if (!includeInactive) {
      whereConditions.push({
        field: 'is_active',
        operator: '==',
        value: true
      });
    }
    
    const reminders = await database.getAllDocuments('reminders', whereConditions);
    res.json(reminders);
  } catch (error) {
    console.error('Error getting reminders:', error);
    res.status(500).json({ error: 'Failed to get reminders' });
  }
});

// Get next highest priority reminder
router.get('/next/one', async (req, res) => {
  try {
    // Get all active reminders
    const reminders = await database.getAllDocuments('reminders', [
      {
        field: 'is_active',
        operator: '==',
        value: true
      }
    ]);
    
    if (reminders.length === 0) {
      return res.status(404).json({ error: 'No active reminders found' });
    }
    
    // Sort by priority (higher number = higher priority)
    reminders.sort((a, b) => {
      // First sort by priority (descending)
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      
      // If priority is the same, sort by due date (ascending)
      if (a.due_date && b.due_date) {
        return new Date(a.due_date) - new Date(b.due_date);
      }
      
      // If no due date for one, prioritize the one with a due date
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      
      // If all else is equal, sort by creation date
      return new Date(a.created_at) - new Date(b.created_at);
    });
    
    // Return the highest priority reminder
    res.json(reminders[0]);
  } catch (error) {
    console.error('Error getting next reminder:', error);
    res.status(500).json({ error: 'Failed to get next reminder' });
  }
});

// Get a specific reminder by ID
router.get('/:id', async (req, res) => {
  try {
    const reminder = await database.getDocument('reminders', req.params.id);
    
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    
    res.json(reminder);
  } catch (error) {
    console.error('Error getting reminder:', error);
    res.status(500).json({ error: 'Failed to get reminder' });
  }
});

// Get all reminders in a specific list
router.get('/list/:listId', async (req, res) => {
  try {
    const reminders = await database.getAllDocuments('reminders', [
      {
        field: 'list_name',
        operator: '==',
        value: req.params.listId
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

// Get inactive reminders from list_group  // example call: GET /reminders/inactive/by-group/כלליות
router.get('/inactive/by-group/:groupName', async (req, res) => {
  try {
    const reminders = await database.getAllDocuments('reminders', [
      { field: 'is_active', operator: '==', value: false },
      { field: 'list_group', operator: '==', value: req.params.groupName }
    ]);
    res.json(reminders);
  } catch (error) {
    console.error('Error getting inactive reminders by group:', error);
    res.status(500).json({ error: 'Failed to get inactive reminders by group' });
  }
});

// Get inactive reminders from a list_name // example call: GET /reminder/inactive/by-list/כללי
router.get('/inactive/by-list/:listName', async (req, res) => {
  try {
    const reminders = await database.getAllDocuments('reminders', [
      { field: 'is_active', operator: '==', value: false },
      { field: 'list_name', operator: '==', value: req.params.listName }
    ]);
    res.json(reminders);
  } catch (error) {
    console.error('Error getting inactive reminders by list:', error);
    res.status(500).json({ error: 'Failed to get inactive reminders by list' });
  }
});


// Create a new reminder
router.post('/', async (req, res) => {
  try {
    const { title, content, list_name, due_date, priority } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const reminderData = {
      title,
      content: content || '',
      list_name: list_name || 'Default',
      due_date: due_date || null,
      priority: priority !== undefined ? Number(priority) : 1,
      is_active: true
    };

    console.log('Creating reminder with data:', reminderData);
    const newReminder = await database.createDocument('reminders', reminderData);
    res.status(201).json(newReminder);
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ error: 'Failed to create reminder', details: error.message });
  }
});

// Update an existing reminder
router.put('/:id', async (req, res) => {
  try {
    const { title, content, list_name, due_date, priority, is_active } = req.body;
    
    // Validate that the reminder exists
    const reminder = await database.getDocument('reminders', req.params.id);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    console.log('Updating existing reminder with data: ', reminderData);
    const reminderData = {};
    if (title !== undefined) reminderData.title = title;
    if (content !== undefined) reminderData.content = content;
    if (list_name !== undefined) reminderData.list_name = list_name;
    if (due_date !== undefined) reminderData.due_date = due_date;
    if (priority !== undefined) reminderData.priority = Number(priority);
    if (is_active !== undefined) reminderData.is_active = is_active;
    
    const updatedReminder = await database.updateDocument('reminders', req.params.id, reminderData);
    res.json(updatedReminder);
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ error: 'Failed to update reminder', details: error.message });
  }
});

// Archive a reminder (mark as inactive)
router.put('/:id/archive', async (req, res) => {
  try {
    // Validate that the reminder exists
    const reminder = await database.getDocument('reminders', req.params.id);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    console.log('Archiving reminder:', req.params.id);
    const updatedReminder = await database.updateDocument('reminders', req.params.id, { is_active: false });
    res.json(updatedReminder);
  } catch (error) {
    console.error('Error archiving reminder:', error);
    res.status(500).json({ error: 'Failed to archive reminder', details: error.message });
  }
});

// Delete a reminder
router.delete('/:id', async (req, res) => {
  try {
    // Validate that the reminder exists
    const reminder = await database.getDocument('reminders', req.params.id);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    console.log('Deleting a reminder with data:', reminderData);
    await database.deleteDocument('reminders', req.params.id);
    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ error: 'Failed to delete reminder', details: error.message });
  }
});


export default router;
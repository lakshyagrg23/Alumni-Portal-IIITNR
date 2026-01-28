# Message Delete and Edit Feature

## Overview
Added delete and edit functionality for messages with real-time synchronization across all devices.

## Features Implemented

### 1. Message Deletion
- **Soft Delete**: Messages are marked as deleted but not removed from database
- **Sender Only**: Only the sender can delete their own messages  
- **UI Display**: Deleted messages show "🚫 Message deleted" placeholder
- **Real-time Sync**: Deletion syncs across all sender and recipient devices instantly

### 2. Message Editing
- **In-place Editing**: Click Edit from message menu to edit inline
- **Encryption**: Edited content is re-encrypted with same E2E encryption
- **History**: Original content preserved in `original_content` column
- **Visual Indicator**: Edited messages show "(edited)" label
- **Real-time Sync**: Edits sync across all devices instantly

### 3. Message Actions Menu
- **Dropdown Menu**: Click ⋮ button on your messages to see options
- **Available for**: Only sender's own messages
- **Options**:
  - ✏️ Edit: Modify message content
  - 🗑️ Delete: Soft delete the message

## Database Changes

Run migration to add new columns:
```bash
cd backend
node run-message-edit-delete-migration.js
```

### New Columns in `messages` table:
- `is_deleted` (BOOLEAN): Soft delete flag
- `deleted_at` (TIMESTAMP): When message was deleted
- `deleted_by` (UUID): User who deleted (sender only)
- `is_edited` (BOOLEAN): Flag if message was edited
- `edited_at` (TIMESTAMP): Last edit timestamp
- `original_content` (TEXT): Original encrypted content before edits

## Backend Changes

### Socket Events Added:

**Delete Message:**
```javascript
socket.emit('message:delete', { messageId, toUserId })
// Server emits: 'message:deleted', 'message:delete:success', 'message:error'
```

**Edit Message:**
```javascript
socket.emit('message:edit', { 
  messageId, 
  newCiphertext, 
  newIv, 
  toUserId 
})
// Server emits: 'message:edited', 'message:edit:success', 'message:error'
```

### Model Methods Added (`Message.js`):
- `Message.softDelete(messageId, deletedBy)`: Soft delete message
- `Message.updateContent(messageId, newContent, newIv)`: Update message content

### Socket Handlers (`socket.js`):
- `message:delete`: Handle message deletion
- `message:edit`: Handle message editing
- `message:deleted`: Broadcast deletion to all devices
- `message:edited`: Broadcast edit to all devices
- `message:error`: Error handling

## Frontend Changes

### New State Variables:
- `editingMessageId`: Currently editing message ID
- `editText`: Text being edited
- `messageMenuOpen`: ID of message with open menu

### New Handler Functions:
- `handleDeleteMessage(messageId)`: Send delete request
- `handleStartEdit(message)`: Enter edit mode
- `handleSubmitEdit()`: Save edited message
- `handleCancelEdit()`: Cancel editing

### UI Components:
1. **Message Actions Menu**: Dropdown with Edit/Delete options
2. **Edit Mode**: Inline textarea with Save/Cancel buttons
3. **Deleted Message**: Grayed out placeholder
4. **Edit Indicator**: "(edited)" label on edited messages

## User Flow

### Deleting a Message:
1. Hover over your message → Click ⋮ button
2. Click "🗑️ Delete" from dropdown
3. Message replaced with "🚫 Message deleted" on all devices

### Editing a Message:
1. Hover over your message → Click ⋮ button
2. Click "✏️ Edit" from dropdown
3. Edit text in inline textarea
4. Click "Save" to confirm or "Cancel" to abort
5. Edited message shows "(edited)" label and syncs to all devices

## Security

✅ **Authorization**: Only message sender can edit/delete
✅ **Encryption**: Edited content re-encrypted with E2E encryption
✅ **Audit Trail**: Original content preserved for audit
✅ **Soft Delete**: Deleted messages retained in database
✅ **Real-time**: Changes broadcast only to sender and recipient

## Testing

1. **Run Migration**:
   ```bash
   cd backend
   node run-message-edit-delete-migration.js
   ```

2. **Start Backend**:
   ```bash
   cd backend
   npm run dev
   ```

3. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

4. **Test Scenarios**:
   - Send a message → Edit it → Verify "(edited)" label
   - Send a message → Delete it → Verify "🚫 Message deleted"
   - Open in two browsers → Verify real-time sync
   - Try editing/deleting other user's messages → Should fail

## Notes

- Messages use soft delete (not permanent removal)
- Original encrypted content preserved in `original_content` column
- Edit history is limited to one version (no multiple edit history)
- Deleted messages still count in conversation but show placeholder
- Edit/Delete only available for text messages (files cannot be edited)

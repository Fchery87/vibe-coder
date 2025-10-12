# Manual Testing Guide - Phase 1 & Phase 2 Features

## Server Status
✅ **Dev Server Running**: http://localhost:3000
✅ **Compilation**: Clean (no errors)

---

## 🧪 Phase 1 Feature Testing

### Feature 1: Multi-File Tabs

#### Test 1.1: Tab Creation
**Steps:**
1. Open the file tree (expand sidebar if collapsed)
2. Click on a file (e.g., `page.tsx`, `TabBar.tsx`, etc.)
3. **Expected**: New tab appears in tab bar with file name and icon

#### Test 1.2: Tab Switching
**Steps:**
1. Open 3-4 different files to create multiple tabs
2. Click on different tabs
3. **Expected**: Editor content updates to show selected file

#### Test 1.3: Tab Closing
**Steps:**
1. Click the X button on a tab
2. **Expected**: Tab closes, next tab becomes active

#### Test 1.4: Keyboard Shortcuts
**Steps:**
1. Open multiple tabs
2. Press `Ctrl+W` (or `Cmd+W` on Mac)
3. **Expected**: Active tab closes
4. Press `Ctrl+Tab`
5. **Expected**: Switch to next tab
6. Press `Ctrl+Shift+Tab`
7. **Expected**: Switch to previous tab
8. Press `Ctrl+1` through `Ctrl+9`
9. **Expected**: Jump to tab by number

#### Test 1.5: Dirty Indicators
**Steps:**
1. Open a file in a tab
2. Modify the content in the editor (if editable)
3. **Expected**: Purple dot appears on tab to indicate unsaved changes

#### Test 1.6: File Icons
**Steps:**
1. Open files with different extensions (.tsx, .ts, .js, .css, .json, .md)
2. **Expected**: Appropriate emoji icons (📘 for TS, 📜 for JS, 🎨 for CSS, etc.)

---

### Feature 2: Command Palette (Cmd/Ctrl+K)

#### Test 2.1: Opening Command Palette
**Steps:**
1. Press `Ctrl+K` (or `Cmd+K` on Mac)
2. **Expected**: Command palette modal appears with search input

#### Test 2.2: Three Sections Display
**Steps:**
1. Open command palette
2. **Expected**: See three sections:
   - **Open Tabs** (if any tabs are open)
   - **Actions** (Generate Code, Create Checkpoint, Export, etc.)
   - **Project Files** (file tree items)

#### Test 2.3: Fuzzy Search
**Steps:**
1. Open command palette
2. Type partial file name (e.g., "tab" to find TabBar.tsx)
3. **Expected**: Matching results appear across all sections

#### Test 2.4: Keyboard Navigation
**Steps:**
1. Open command palette
2. Press ↓ arrow key multiple times
3. **Expected**: Selection moves down through items (purple highlight)
4. Press ↑ arrow key
5. **Expected**: Selection moves up
6. Press Enter on a file
7. **Expected**: File opens in new tab and palette closes

#### Test 2.5: Action Execution
**Steps:**
1. Open command palette
2. Navigate to "Generate Code" action
3. Press Enter
4. **Expected**: Switch to chat tab
5. Repeat for other actions:
   - **Create Checkpoint**: Should trigger checkpoint creation
   - **Toggle Theme**: Should switch light/dark theme
   - **Clear Chat**: Should clear chat messages
   - **Open Settings**: Should open settings modal

#### Test 2.6: ESC to Close
**Steps:**
1. Open command palette
2. Press ESC
3. **Expected**: Palette closes

---

### Feature 3: Improved Diff Viewer

#### Test 3.1: Accessing Diff Viewer
**Steps:**
1. Generate some code (use chat to generate a component)
2. Make changes to the generated code
3. Navigate to wherever diffs are shown (likely in comparison view)
4. **Expected**: Diff viewer appears

#### Test 3.2: Split View
**Steps:**
1. In diff viewer, look for view toggle button
2. Select "Split" view
3. **Expected**: Side-by-side comparison (old code on left, new on right)

#### Test 3.3: Unified View
**Steps:**
1. In diff viewer, select "Unified" view
2. **Expected**: Inline view with +/- indicators (like GitHub)

#### Test 3.4: Syntax Highlighting
**Steps:**
1. Look at code in diff viewer
2. **Expected**: Keywords, strings, numbers, comments are colored

#### Test 3.5: Jump to Changes
**Steps:**
1. In diff viewer with multiple changes, click "Jump to Next Change"
2. **Expected**: Scrolls to next change, shows position (e.g., "2/5")
3. Click "Jump to Previous Change"
4. **Expected**: Scrolls to previous change

#### Test 3.6: Stats Display
**Steps:**
1. Look at diff viewer header
2. **Expected**: Shows stats like "+12 -5 (3 changes)"

---

### Feature 4: Notification Center

#### Test 4.1: Bell Icon
**Steps:**
1. Look at header bar (top right area)
2. **Expected**: Bell icon is visible

#### Test 4.2: Badge Count
**Steps:**
1. Trigger a notification (generate code, create checkpoint, etc.)
2. Look at bell icon
3. **Expected**: Purple badge with number appears (e.g., "1", "2", "99+")

#### Test 4.3: Opening Notification Drawer
**Steps:**
1. Click bell icon
2. **Expected**: Drawer slides in from right with backdrop overlay

#### Test 4.4: Notification List
**Steps:**
1. Open notification drawer
2. **Expected**: See list of notifications with:
   - Color-coded by type (green=success, red=error, yellow=warning, blue=info)
   - Time ago ("5m ago", "2h ago")
   - Unread indicator (purple dot)
   - Message text

#### Test 4.5: Actionable Notifications
**Steps:**
1. Trigger a file modification notification (if integrated with CLI)
2. Open notification drawer
3. **Expected**: See action buttons like "Open File" or "View in Tree"
4. Click an action button
5. **Expected**: Action executes (file opens in tab) and notification marked as read

#### Test 4.6: Mark as Read
**Steps:**
1. Click "Mark as Read" button on an unread notification
2. **Expected**: Purple dot disappears, badge count decreases

#### Test 4.7: Delete Notification
**Steps:**
1. Click delete button (trash icon) on a notification
2. **Expected**: Notification disappears from list

#### Test 4.8: Mark All Read
**Steps:**
1. Have multiple unread notifications
2. Click "Mark All Read" button
3. **Expected**: All purple dots disappear, badge count goes to 0

#### Test 4.9: Clear All
**Steps:**
1. Click "Clear All" button
2. **Expected**: All notifications disappear, shows empty state

#### Test 4.10: Toast Integration
**Steps:**
1. Trigger an action that shows a toast (generate code, export, etc.)
2. **Expected**: Toast appears AND notification is added to history
3. Wait for toast to disappear
4. Open notification drawer
5. **Expected**: Notification is still there in history

---

## 🧪 Phase 2 Feature Testing

### Feature 1: Virtual File Tree Scrolling

#### Test 1.1: Large File Tree
**Note**: To properly test this, you'd need a project with 100+ files, or use the test generator.

**Steps (if available):**
1. If file tree has many files, scroll through it
2. **Expected**: Smooth scrolling with no lag
3. Expand multiple folders
4. **Expected**: Performance remains smooth

#### Test 1.2: Context Menu
**Steps:**
1. Right-click on a file in the file tree
2. **Expected**: Context menu appears with options:
   - Explain
   - Refactor
   - Add tests
   - Optimize

#### Test 1.3: Expand/Collapse All
**Steps:**
1. Look for "Expand" button in file tree header
2. Click it
3. **Expected**: All folders expand
4. Click "Collapse" button
5. **Expected**: All folders collapse

---

### Feature 2: Skeleton Loading States

#### Test 2.1: Code Editor Skeleton
**Steps:**
1. Trigger code generation (submit a prompt in chat)
2. While generating, look at editor area
3. **Expected**: See skeleton with shimmer animation showing placeholder lines

#### Test 2.2: File Tree Skeleton
**Note**: This may only appear on initial load or when switching projects.

**Steps:**
1. If file tree shows loading state
2. **Expected**: See skeleton with indented items and circular icon placeholders

#### Test 2.3: Shimmer Animation
**Steps:**
1. While any skeleton is visible
2. **Expected**: Horizontal shimmer effect sweeps across (light gradient moving left to right)

---

### Feature 3: Micro-interactions & Polish

#### Test 3.1: Button Hover Effects
**Steps:**
1. Hover over any button (e.g., "Generate", "Export", "Checkpoint")
2. **Expected**: Button lifts slightly (-1px) with purple glow shadow

#### Test 3.2: Button Click Ripple
**Steps:**
1. Click a button
2. **Expected**: Ripple effect emanates from click point

#### Test 3.3: Modal Animations
**Steps:**
1. Open command palette or settings modal
2. **Expected**: Slides in smoothly (not instant)
3. Close modal
4. **Expected**: Slides out smoothly

#### Test 3.4: Notification Drawer Animation
**Steps:**
1. Open notification center
2. **Expected**: Drawer slides in from right smoothly
3. Close drawer
4. **Expected**: Drawer slides out to right

#### Test 3.5: Tab Hover Effects
**Steps:**
1. Hover over inactive tabs
2. **Expected**: Subtle hover effect (background color or opacity change)

#### Test 3.6: Loading Spinner
**Steps:**
1. Trigger code generation or any async operation
2. **Expected**: See spinning indicator (smooth rotation)

#### Test 3.7: Tooltip Fade
**Steps:**
1. Hover over elements with tooltips (if present)
2. **Expected**: Tooltips fade in smoothly (not instant)

---

## 🔍 Cross-Feature Integration Testing

### Integration 1: Command Palette → Tabs
**Steps:**
1. Press `Ctrl+K` to open command palette
2. Search for a file name
3. Press Enter to select it
4. **Expected**: File opens in new tab, palette closes

### Integration 2: File Tree → Tabs
**Steps:**
1. Click a file in file tree
2. **Expected**: File opens in new tab
3. Click another file
4. **Expected**: New tab created (or switches to existing tab if already open)

### Integration 3: Notifications → Tabs
**Steps:**
1. Open notification with "Open File" action
2. Click "Open File"
3. **Expected**: File opens in new tab, notification drawer closes

### Integration 4: Tabs → Editor
**Steps:**
1. Open 3 files in tabs
2. Switch between tabs
3. **Expected**: Editor content updates instantly to show correct file

### Integration 5: Command Palette → Actions
**Steps:**
1. Open command palette
2. Execute "Generate Code" action
3. **Expected**: Switches to chat tab
4. Open palette again, execute "Create Checkpoint"
5. **Expected**: Checkpoint created, notification appears

### Integration 6: Keyboard Shortcuts (No Conflicts)
**Steps:**
1. Test each shortcut one by one:
   - `Ctrl+K` → Command Palette
   - `Ctrl+W` → Close Tab
   - `Ctrl+Tab` → Next Tab
   - `Ctrl+1-9` → Jump to Tab
2. **Expected**: All shortcuts work without interfering with each other

---

## 📊 Performance Testing

### Performance 1: Tab Switching Speed
**Steps:**
1. Open 10+ tabs
2. Rapidly switch between tabs using `Ctrl+Tab`
3. **Expected**: Instant switching, no lag

### Performance 2: Command Palette Search
**Steps:**
1. Open command palette
2. Type rapidly in search box
3. **Expected**: Results update instantly, no input lag

### Performance 3: Animation Frame Rate
**Steps:**
1. Open DevTools (F12)
2. Go to Performance tab
3. Start recording
4. Trigger multiple animations (hover buttons, open modals, switch tabs)
5. Stop recording
6. **Expected**: Consistent 60fps during animations

### Performance 4: Memory Leaks
**Steps:**
1. Open DevTools → Memory tab
2. Take heap snapshot
3. Open/close 20+ tabs
4. Open/close command palette 20+ times
5. Take another heap snapshot
6. **Expected**: Memory usage should not significantly increase

---

## ✅ Testing Checklist Summary

### Phase 1 Features
- [ ] Multi-File Tabs (6 tests)
- [ ] Command Palette (6 tests)
- [ ] Diff Viewer (6 tests)
- [ ] Notification Center (10 tests)

### Phase 2 Features
- [ ] Virtual File Tree (3 tests)
- [ ] Skeleton Loading States (3 tests)
- [ ] Micro-interactions (7 tests)

### Integration Tests
- [ ] Cross-feature interactions (6 tests)

### Performance Tests
- [ ] Performance validation (4 tests)

---

## 🐛 Bug Reporting

If you find any issues during testing, please note:
1. **Feature Name**: Which feature has the issue
2. **Test Case**: Which test case failed
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happened
5. **Console Errors**: Any errors in browser DevTools console
6. **Screenshots**: Visual evidence if applicable

---

## 🎯 Success Criteria

All features pass their tests with:
- ✅ No console errors
- ✅ Smooth animations (60fps)
- ✅ Proper visual feedback
- ✅ Keyboard shortcuts working
- ✅ Cross-feature integration working
- ✅ No memory leaks
- ✅ Responsive UI

---

**Ready to test!** Open http://localhost:3000 in your browser and work through each test case. 🚀

# PromptPanel Refactoring

This document describes the refactored structure of the PromptPanel component and related features.

## Overview

The PromptPanel has been refactored from a single 230-line file into a feature-based architecture with:
- Separated concerns (messages, activities, prompt input)
- Reusable components
- Custom hooks for logic extraction
- Shared type definitions
- Better scalability and maintainability

## Directory Structure

```
src/
├── types/
│   └── session.ts                    # Shared types (Message, Activity, FsPatch)
├── hooks/
│   ├── index.ts                      # Hook exports
│   ├── useAutoScroll.ts              # Auto-scroll to bottom logic
│   └── usePromptSubmit.ts            # Form submission logic
├── components/
│   ├── messages/
│   │   ├── index.ts                  # Message component exports
│   │   ├── MessageList.tsx           # List of messages with empty state
│   │   └── MessageItem.tsx           # Individual message bubble
│   ├── activities/
│   │   ├── index.ts                  # Activity component exports
│   │   ├── ActivityFeed.tsx          # Activity feed with loading state
│   │   └── ActivityItem.tsx          # Individual activity item (tool/file/text)
│   ├── prompt/
│   │   ├── index.ts                  # Prompt component exports
│   │   ├── PromptHeader.tsx          # Desktop header
│   │   ├── PromptInput.tsx           # Reusable input component
│   │   └── MobilePromptPanel.tsx     # Mobile-specific layout
│   └── layout/
│       └── PromptPanel.tsx           # Main orchestrator component
└── stores/
    └── session.ts                    # Updated to use shared types
```

## Components

### PromptPanel (Main Orchestrator)
**Location:** `components/layout/PromptPanel.tsx`

The main component that orchestrates all sub-components. Handles:
- Mobile vs desktop layout switching
- State management via Zustand store
- Composition of sub-components

**Props:**
- `mobile?: boolean` - Enables mobile layout

### Messages Feature

#### MessageList
**Location:** `components/messages/MessageList.tsx`

Displays a list of messages with an empty state.

**Props:**
- `messages: Message[]` - Array of messages to display

#### MessageItem
**Location:** `components/messages/MessageItem.tsx`

Renders an individual message bubble with role-based styling.

**Props:**
- `message: Message` - Message object to render

### Activities Feature

#### ActivityFeed
**Location:** `components/activities/ActivityFeed.tsx`

Displays recent agent activities (last 5) with loading states.

**Props:**
- `activities: Activity[]` - Array of activities

#### ActivityItem
**Location:** `components/activities/ActivityItem.tsx`

Renders an individual activity with type-specific icons and formatting.

**Props:**
- `activity: Activity` - Activity object to render

**Activity Types:**
- `tool` - Blue wrench icon, shows tool name and title
- `file` - Green file icon, shows modified file path
- `text` - Purple message icon, shows text content

### Prompt Feature

#### PromptHeader
**Location:** `components/prompt/PromptHeader.tsx`

Desktop header with title and subtitle.

**Props:**
- `title?: string` - Header title (default: "Game Agent")
- `subtitle?: string` - Header subtitle (default: "Describe your game idea")

#### PromptInput
**Location:** `components/prompt/PromptInput.tsx`

Reusable input component with submit button and loading states.

**Props:**
- `value: string` - Input value
- `onChange: (value: string) => void` - Change handler
- `onSubmit: (e: FormEvent) => void` - Submit handler
- `isLoading?: boolean` - Loading state
- `placeholder?: string` - Input placeholder
- `disabled?: boolean` - Disabled state

#### MobilePromptPanel
**Location:** `components/prompt/MobilePromptPanel.tsx`

Mobile-specific layout with expandable message view.

**Props:**
- `value: string` - Input value
- `onChange: (value: string) => void` - Change handler
- `onSubmit: (e: FormEvent) => void` - Submit handler
- `isLoading?: boolean` - Loading state
- `messages: Message[]` - Messages to display
- `expanded: boolean` - Expansion state
- `onToggleExpanded: () => void` - Toggle handler

## Custom Hooks

### useAutoScroll
**Location:** `hooks/useAutoScroll.ts`

Automatically scrolls to bottom when dependencies change.

**Usage:**
```typescript
const scrollRef = useAutoScroll([messages, activities])
// ...
<div ref={scrollRef} />
```

**Parameters:**
- `dependencies: unknown[]` - Array of dependencies to watch

**Returns:**
- `scrollRef: RefObject<HTMLDivElement>` - Ref to attach to scroll target

### usePromptSubmit
**Location:** `hooks/usePromptSubmit.ts`

Handles prompt input state and form submission logic.

**Usage:**
```typescript
const { input, setInput, handleSubmit, canSubmit } = usePromptSubmit({
  onSubmit: sendPrompt,
  isDisabled: isLoading,
})
```

**Parameters:**
- `onSubmit: (prompt: string) => void` - Callback when form is submitted
- `isDisabled?: boolean` - Whether submission is disabled

**Returns:**
- `input: string` - Current input value
- `setInput: (value: string) => void` - Update input value
- `handleSubmit: (e: FormEvent) => void` - Form submit handler
- `canSubmit: boolean` - Whether form can be submitted

## Shared Types

### Message
**Location:** `types/session.ts`

```typescript
interface Message {
  id: string
  role: "user" | "agent"
  content: string
}
```

### Activity
**Location:** `types/session.ts`

```typescript
interface Activity {
  id: string
  type: "tool" | "text" | "file"
  timestamp: number
  data: {
    tool?: string
    title?: string
    path?: string
    text?: string
  }
}
```

### FsPatch
**Location:** `types/session.ts`

```typescript
interface FsPatch {
  op: "write" | "delete" | "mkdir"
  path: string
  content?: string
}
```

## Benefits of This Structure

1. **Separation of Concerns**: Each feature has its own folder with related components
2. **Reusability**: Components like `PromptInput` can be reused elsewhere
3. **Testability**: Smaller, focused components are easier to test
4. **Maintainability**: Changes to one feature don't affect others
5. **Scalability**: Easy to add new features or modify existing ones
6. **Type Safety**: Shared types ensure consistency across the app
7. **Logic Extraction**: Custom hooks separate business logic from UI

## Future Enhancements

Potential improvements that can be easily added:

1. **Message Formatting**: Add markdown support to MessageItem
2. **Activity Filtering**: Add filters to ActivityFeed
3. **Input Enhancements**: Add autocomplete, suggestions, or multi-line support
4. **Animations**: Add enter/exit animations to messages and activities
5. **Accessibility**: Add ARIA labels and keyboard navigation
6. **Virtualization**: Add virtual scrolling for large message lists
7. **Persistence**: Save messages to localStorage
8. **Testing**: Add unit tests for each component and hook

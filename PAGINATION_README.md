# Pagination Implementation for Users and Queues

This document describes the pagination implementation added to the `/users` and `/queues` routes in both the backend and frontend.

## Backend Changes

### GenesysService Updates

The `GenesysService` class has been updated to support pagination:

- **`getUsers(page: number, limit: number)`**: Now returns paginated results with pagination metadata
- **`getQueues(page: number, limit: number)`**: Now returns paginated results with pagination metadata

Both methods return an object containing:

```typescript
{
  users/queues: Array<T>,
  pagination: {
    page: number,
    limit: number,
    total: number,
    pages: number
  }
}
```

### Route Updates

The following routes now support pagination query parameters:

- **`GET /api/v1/genesys/users`**

  - Query parameters:
    - `page` (optional): Page number (default: 1, min: 1)
    - `limit` (optional): Items per page (default: 20, min: 1, max: 100)
  - Response includes pagination metadata

- **`GET /api/v1/genesys/queues`**
  - Query parameters:
    - `page` (optional): Page number (default: 1, min: 1)
    - `limit` (optional): Items per page (default: 20, min: 1, max: 100)
  - Response includes pagination metadata

## Frontend Changes

### New Components

- **`Pagination.tsx`**: A reusable pagination component with:
  - Page navigation (Previous/Next buttons)
  - Page number display with ellipsis for large page counts
  - Items per page selector (10, 20, 50, 100)
  - Current page indicator
  - Results count display

### GenesysIntegration Page Updates

The GenesysIntegration page now includes:

- **Pagination state management** for both users and queues
- **Loading states** for individual data fetching operations
- **Refresh buttons** for each tab
- **Pagination controls** at the bottom of each data list
- **Error handling** with toast notifications

## Features

### Pagination Controls

- Navigate between pages using Previous/Next buttons
- Jump to specific page numbers
- Change items per page (10, 20, 50, 100)
- Automatic page reset when changing items per page

### User Experience

- Loading indicators during data fetching
- Empty state messages when no data is found
- Refresh buttons for manual data updates
- Responsive design for mobile and desktop

### Performance

- Backend pagination reduces memory usage
- Frontend pagination improves UI responsiveness
- Efficient data fetching with configurable page sizes

## Usage Examples

### Backend API Calls

```bash
# Get first page with 20 items (default)
GET /api/v1/genesys/users

# Get second page with 10 items
GET /api/v1/genesys/users?page=2&limit=10

# Get first page with 50 items
GET /api/v1/genesys/queues?limit=50
```

### Frontend Integration

```typescript
// Example of using pagination state
const [usersPage, setUsersPage] = useState(1);
const [usersLimit, setUsersLimit] = useState(20);

// Fetch users with pagination
const fetchUsers = async (page: number, limit: number) => {
  const response = await fetch(
    `/api/v1/genesys/users?page=${page}&limit=${limit}`
  );
  const data = await response.json();
  // Handle response with pagination data
};
```

## Technical Notes

- **Backend**: Uses client-side pagination since Genesys Cloud API doesn't provide total count in a single request
- **Frontend**: State management with React hooks for pagination parameters
- **Validation**: Input validation for page and limit parameters
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## Future Enhancements

- Server-side caching for better performance
- Real-time data updates
- Advanced filtering and sorting options
- Export functionality for paginated data
- Bulk operations on selected items

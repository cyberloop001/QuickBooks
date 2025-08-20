# Call Records Pagination Implementation

This document describes the pagination implementation for call records using the Genesys Cloud Analytics API.

## Overview

The call records functionality has been updated to use the Genesys Cloud Analytics API with full pagination support. This provides better performance and scalability for large datasets.

## Backend Changes

### GenesysService Updates

The `GenesysService.getCallRecords()` method has been completely refactored to use the new Analytics API:

#### New Method Signature

```typescript
async getCallRecords(
  startDate: Date,
  endDate: Date,
  page: number = 1,
  limit: number = 25,
  userIds?: string[],
  queueIds?: string[],
  filters?: any
): Promise<{
  callRecords: GenesysCallRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}>
```

#### New API Structure

The method now uses the Genesys Analytics API with the following structure:

```json
{
  "interval": "2015-11-01T00:00:00.000Z/2015-11-02T00:00:00.000Z",
  "segmentFilters": [
    {
      "type": "and",
      "predicates": [
        {
          "dimension": "mediaType",
          "value": "voice"
        }
      ]
    }
  ],
  "aggregations": [
    {
      "type": "termFrequency",
      "dimension": "wrapUpCode",
      "size": 10
    }
  ],
  "pageSize": 25,
  "pageNumber": 1
}
```

#### Enhanced Call Record Data

Call records now include additional fields:

- `wrapUpCode`: The wrap-up code assigned to the call
- `recordingId`: The recording ID if available

### Route Updates

The `/api/v1/genesys/call-records` route now supports pagination:

#### Query Parameters

- `startDate` (required): Start date in ISO format
- `endDate` (required): End date in ISO format
- `userIds` (optional): Array of user IDs to filter by
- `queueIds` (optional): Array of queue IDs to filter by
- `page` (optional): Page number (default: 1, min: 1)
- `limit` (optional): Items per page (default: 25, min: 1, max: 100)

#### Response Format

```json
{
  "success": true,
  "data": {
    "callRecords": [...],
    "pagination": {
      "page": 1,
      "limit": 25,
      "total": 150,
      "pages": 6
    },
    "summary": {
      "totalCalls": 150,
      "totalMinutes": 120,
      "dateRange": {
        "start": "2024-01-01T00:00:00.000Z",
        "end": "2024-01-02T00:00:00.000Z"
      }
    }
  }
}
```

## Frontend Changes

### New State Management

Added pagination state for call records:

```typescript
const [callRecordsPage, setCallRecordsPage] = useState(1);
const [callRecordsLimit, setCallRecordsLimit] = useState(25);
const [callRecordsPagination, setCallRecordsPagination] = useState({
  page: 1,
  limit: 25,
  total: 0,
  pages: 0,
});
const [callRecordsLoading, setCallRecordsLoading] = useState(false);
```

### Enhanced UI Components

#### Status Card

- Added a fourth status card showing total call records count
- Updated grid layout to accommodate 4 cards (responsive: 1 col on mobile, 2 on tablet, 4 on desktop)

#### Calls Tab

- Added refresh button for manual data updates
- Integrated pagination component with page navigation
- Added loading states and empty state handling
- Enhanced call record display with new fields (wrap-up code, recording ID)

#### Pagination Controls

- Page navigation (Previous/Next buttons)
- Page number display with ellipsis for large page counts
- Items per page selector (10, 20, 50, 100)
- Current page indicator and results count

### Enhanced Data Fetching

The `fetchCallRecords` function now:

- Supports pagination parameters
- Updates pagination state
- Provides loading feedback
- Handles errors gracefully

## API Features

### Genesys Analytics API Integration

- **Interval-based queries**: Uses ISO 8601 interval format
- **Segment filters**: Supports complex filtering by dimensions, metrics, and properties
- **Aggregations**: Provides wrap-up code frequency analysis
- **Pagination**: Native API pagination support with total hits

### Filtering Capabilities

- **Media type**: Filter by voice, chat, email
- **User filtering**: Filter by specific user IDs
- **Queue filtering**: Filter by specific queue IDs
- **Custom filters**: Support for additional filter types

### Performance Optimizations

- **Client-side pagination**: Efficient data handling
- **Configurable page sizes**: 10, 20, 50, 100 items per page
- **Smart data fetching**: Only loads required data for current page

## Usage Examples

### Backend API Calls

```bash
# Get first page with 25 items (default)
GET /api/v1/genesys/call-records?startDate=2024-01-01&endDate=2024-01-02

# Get second page with 10 items
GET /api/v1/genesys/call-records?startDate=2024-01-01&endDate=2024-01-02&page=2&limit=10

# Filter by specific users
GET /api/v1/genesys/call-records?startDate=2024-01-01&endDate=2024-01-02&userIds[]=user1&userIds[]=user2

# Filter by specific queues
GET /api/v1/genesys/call-records?startDate=2024-01-01&endDate=2024-01-02&queueIds[]=queue1&queueIds[]=queue2
```

### Frontend Integration

```typescript
// Example of using call records pagination
const [callRecordsPage, setCallRecordsPage] = useState(1);
const [callRecordsLimit, setCallRecordsLimit] = useState(25);

// Fetch call records with pagination
const fetchCallRecords = async (page: number, limit: number) => {
  const response = await fetch(
    `/api/v1/genesys/call-records?startDate=${startDate}&endDate=${endDate}&page=${page}&limit=${limit}`
  );
  const data = await response.json();
  // Handle response with pagination data
};
```

## Technical Implementation

### Backend Architecture

- **Service layer**: Handles API communication and data transformation
- **Route validation**: Input validation for all parameters
- **Error handling**: Comprehensive error handling with logging
- **Response formatting**: Consistent API response structure

### Frontend Architecture

- **State management**: React hooks for pagination state
- **Component composition**: Reusable pagination component
- **Loading states**: Visual feedback during operations
- **Error handling**: User-friendly error messages

### Data Flow

1. User selects date range and pagination parameters
2. Frontend sends API request with parameters
3. Backend validates parameters and calls Genesys API
4. Genesys returns paginated results with total hits
5. Backend transforms data and returns paginated response
6. Frontend updates state and renders paginated data

## Benefits

### Performance

- **Reduced memory usage**: Only loads current page data
- **Faster UI rendering**: Smaller datasets to process
- **Efficient API calls**: Optimized data transfer

### User Experience

- **Better navigation**: Easy page-by-page browsing
- **Configurable views**: Users can choose items per page
- **Loading feedback**: Clear indication of data fetching
- **Error handling**: Graceful error recovery

### Scalability

- **Large datasets**: Handle thousands of call records efficiently
- **API limits**: Respect Genesys API pagination limits
- **Memory management**: Efficient memory usage for large datasets

## Future Enhancements

### Advanced Filtering

- **Date range presets**: Quick date selection (today, yesterday, last week)
- **Saved filters**: User-defined filter combinations
- **Advanced search**: Full-text search across call data

### Analytics Integration

- **Real-time updates**: Live data refresh capabilities
- **Export functionality**: CSV/Excel export of paginated data
- **Bulk operations**: Multi-select and bulk actions

### Performance Improvements

- **Caching**: Server-side caching for frequently accessed data
- **Virtual scrolling**: Infinite scroll for very large datasets
- **Background sync**: Pre-fetching of adjacent pages

## Migration Notes

### Breaking Changes

- **API response format**: Now includes pagination metadata
- **Method signatures**: Service methods return paginated objects
- **Route parameters**: New pagination query parameters

### Compatibility

- **Existing integrations**: May need updates for new response format
- **Frontend components**: Require pagination state management
- **API clients**: Should handle pagination parameters

### Testing

- **Unit tests**: Update service method tests
- **Integration tests**: Test pagination functionality
- **API tests**: Verify Genesys API integration

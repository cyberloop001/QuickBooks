# Region & Team Management System

This document describes the new region and team management system that provides centralized organizational structure management for the QuickBooks Phone Billing System.

## 🏗️ Overview

The region/team management system allows you to:
- Create and manage organizational regions (e.g., North America, Europe, Asia Pacific)
- Create and manage teams within each region
- Assign Genesys queues to specific teams
- Track unassigned queues that need attention
- Use the same organizational structure across multiple pages (hiring needs, billing, etc.)

## 📊 Database Schema

### Regions Table
- `id` (UUID, primary key)
- `name` (unique text) - Region name
- `description` (optional text) - Region description
- `isActive` (boolean) - Whether region is active
- `createdAt`, `updatedAt` (timestamps)

### Teams Table
- `id` (UUID, primary key)
- `name` (text) - Team name
- `description` (optional text) - Team description
- `regionId` (foreign key to regions) - Parent region
- `isActive` (boolean) - Whether team is active
- `createdAt`, `updatedAt` (timestamps)

### Queue Assignments Table
- `id` (UUID, primary key)
- `queueId` (text, unique) - Genesys queue ID
- `queueName` (text) - Genesys queue name
- `teamId` (foreign key to teams) - Assigned team
- `assignedAt` (timestamp) - When assigned
- `assignedBy` (optional text) - Who assigned it
- `notes` (optional text) - Assignment notes
- `createdAt`, `updatedAt` (timestamps)

## 🔧 Backend Components

### TypeORM Entities
- `src/entities/Region.ts` - Region entity
- `src/entities/Team.ts` - Team entity
- `src/entities/QueueAssignment.ts` - Queue assignment entity

### Services
- `src/services/RegionService.ts` - Region CRUD operations
- `src/services/TeamService.ts` - Team CRUD operations
- `src/services/QueueAssignmentService.ts` - Queue assignment operations

### API Routes
- `src/routes/regions.ts` - Region management endpoints
- `src/routes/teams.ts` - Team management endpoints
- `src/routes/queueAssignments.ts` - Queue assignment endpoints

### API Endpoints

#### Regions
- `GET /api/v1/regions` - Get all regions
- `GET /api/v1/regions/active` - Get active regions only
- `GET /api/v1/regions/stats` - Get region statistics
- `GET /api/v1/regions/:id` - Get region by ID
- `POST /api/v1/regions` - Create new region
- `PUT /api/v1/regions/:id` - Update region
- `DELETE /api/v1/regions/:id` - Delete region

#### Teams
- `GET /api/v1/teams` - Get all teams
- `GET /api/v1/teams/active` - Get active teams only
- `GET /api/v1/teams/by-region/:regionId` - Get teams by region
- `GET /api/v1/teams/stats` - Get team statistics
- `GET /api/v1/teams/:id` - Get team by ID
- `POST /api/v1/teams` - Create new team
- `PUT /api/v1/teams/:id` - Update team
- `DELETE /api/v1/teams/:id` - Delete team

#### Queue Assignments
- `GET /api/v1/queue-assignments` - Get all queue assignments
- `GET /api/v1/queue-assignments/unassigned` - Get unassigned queues
- `GET /api/v1/queue-assignments/by-team/:teamId` - Get assignments by team
- `GET /api/v1/queue-assignments/stats` - Get assignment statistics
- `GET /api/v1/queue-assignments/:id` - Get assignment by ID
- `POST /api/v1/queue-assignments` - Create new assignment
- `PUT /api/v1/queue-assignments/:id` - Update assignment
- `DELETE /api/v1/queue-assignments/:id` - Delete assignment

## 🎨 Frontend Components

### Main Page
- `frontend/src/pages/RegionTeamManagement.tsx` - Main management interface

### Features
- **Overview Tab**: Statistics and high-level view
- **Regions Tab**: Manage regions
- **Teams Tab**: Manage teams
- **Queue Assignments Tab**: View assigned queues
- **Unassigned Queues Tab**: Manage unassigned queues

### Key Features
- Real-time statistics dashboard
- Unassigned queue alerts
- Hierarchical organization view (Region → Team → Queue)
- Quick assignment actions
- Edit/delete capabilities

## 🚀 Setup Instructions

### 1. Database Migration
For existing databases, run the migration script:
```bash
psql -U your_user -d your_database -f database/add_regions_teams_migration.sql
```

For new installations, the tables are included in `database/init.sql`.

### 2. Backend Setup
The new entities, services, and routes are automatically included. No additional setup required.

### 3. Frontend Setup
The new page is automatically included in the navigation. Access it via the "Region & Teams" menu item.

## 📋 Usage

### 1. Create Regions
1. Navigate to Region & Team Management
2. Click "New Region"
3. Enter region name and description
4. Save

### 2. Create Teams
1. Navigate to Region & Team Management
2. Click "New Team"
3. Select a region
4. Enter team name and description
5. Save

### 3. Assign Queues
1. Go to the "Unassigned Queues" tab
2. Click "Assign to Team" for any queue
3. Select the appropriate team
4. Add notes if needed
5. Save

### 4. Monitor Assignments
- View all assignments in the "Queue Assignments" tab
- See statistics in the "Overview" tab
- Get alerts for unassigned queues

## 🔄 Integration with Other Pages

The region/team structure can be reused across multiple pages:

### Hiring Needs Page
- Filter hiring needs by region/team
- Organize job postings by team
- Track hiring progress by region

### Billing Jobs
- Group billing by region/team
- Generate region-specific reports
- Track performance by team

### Customer Profiles
- Associate customers with regions/teams
- Filter customers by team
- Generate team-specific reports

## 📈 Benefits

1. **Centralized Management**: One place to define organizational structure
2. **Consistency**: Same structure used across all pages
3. **Scalability**: Easy to add new regions and teams
4. **Visibility**: Clear view of queue assignments and unassigned items
5. **Flexibility**: Structure can be modified as organization grows
6. **Audit Trail**: Complete history of queue assignments

## 🛠️ Future Enhancements

- Bulk queue assignment
- Queue assignment templates
- Performance metrics by team
- Automated queue assignment rules
- Integration with Genesys user management
- Advanced reporting and analytics

## 📝 Notes

- Each queue can only be assigned to one team
- Regions cannot be deleted if they have teams
- Teams cannot be deleted if they have assigned queues
- All operations include proper validation and error handling
- The system maintains referential integrity

# FlexList - Smart Collection Manager

## Overview

FlexList is a full-stack web application for managing collections of items with flexible tagging and filtering capabilities. Built as a collection management system, it allows users to create collections (like "Songs I Know") and add items with custom tags and metadata. The application features a clean, modern interface with search and filtering functionality, making it ideal for organizing music, books, recipes, or any categorizable content.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Data Storage**: In-memory storage with JSON file persistence (configurable for database)
- **Validation**: Zod schemas for request/response validation
- **Error Handling**: Centralized error middleware with structured error responses

### Data Storage Solutions
- **Primary Storage**: Drizzle ORM configured for PostgreSQL (using Neon Database)
- **Tag Cataloging**: Persistent tag storage with `tags` and `item_tags` tables for autocomplete functionality
- **Schema Management**: Drizzle migrations with schema definitions in TypeScript
- **Data Models**: Collections, Items, Tags, and ItemTags with normalized tag relationships

### Database Schema
- **Collections Table**: ID, name, description
- **Items Table**: ID, collection ID (foreign key), title, notes, tags (JSON object for compatibility)
- **Tags Table**: ID, key, value - normalized storage for unique tag key-value pairs
- **ItemTags Table**: itemId, tagId - many-to-many relationship linking items to tags
- **Tag Cataloging**: Persistent storage enables autocomplete for previously used keys and values

### API Structure
- **Collections Endpoints**: CRUD operations for managing collections
  - GET /api/collections - List all collections with item counts
  - GET /api/collections/:id - Get specific collection details
  - POST /api/collections - Create new collection
  - PUT /api/collections/:id - Update collection
  - DELETE /api/collections/:id - Delete collection
- **Items Endpoints**: CRUD operations for collection items
  - GET /api/collections/:id/items - Get items in collection with filtering
  - POST /api/items - Create new item
  - PUT /api/items/:id - Update item
  - DELETE /api/items/:id - Delete item
- **Tag Cataloging Endpoints**: Autocomplete support for tag input
  - GET /api/tags/keys - Get all unique tag keys for autocomplete
  - GET /api/tags/values/:key - Get all values for a specific tag key
- **Filtering**: Query parameters for tag-based filtering and text search with client-side sorting options

### Development & Build Tools
- **Build System**: Vite for frontend bundling with React plugin
- **Type Checking**: TypeScript with strict mode enabled
- **Code Quality**: Shared TypeScript configuration across client/server
- **Development**: Hot module replacement and error overlay for development
- **Deployment**: Single build command that bundles both frontend and backend

### Key Features
- **Flexible Tagging System**: Items can have arbitrary key-value tag pairs
- **Persistent Tag Cataloging**: Autocomplete for tag keys and values from previously used tags
- **Advanced Filtering**: Multiple simultaneous filters per tag key (e.g., Style: Jazz + Blues), search by text, combine filters across categories
- **Smart Sorting**: A-Z, Z-A, and Filter Order sorting (maintains the order of selected filter values)
- **Dual View Modes**: Toggle between compact list view (names only) and detailed view (with all tags and notes visible)
- **Real-time Updates**: Optimistic updates with query invalidation
- **Responsive Design**: Mobile-friendly interface with collapsible sidebar
- **Bulk Import**: Import up to 1000 items at once with smart duplicate filtering and automatic "[  ]" prefix removal
- **Advanced Theme System**: Light/Dark/Auto modes with time-based switching (defaults to Auto), square toggle button in header
- **Type Safety**: End-to-end TypeScript with shared schemas between client and server

## External Dependencies

### Database & ORM
- **Drizzle ORM**: PostgreSQL object-relational mapping with type-safe queries
- **Neon Database**: Serverless PostgreSQL database for production
- **Drizzle Kit**: Schema migrations and database management tools

### Frontend Libraries
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework for styling
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management with validation
- **Zod**: Schema validation for type safety
- **Wouter**: Lightweight routing library
- **Lucide React**: Icon library for UI elements

### Backend Libraries
- **Express.js**: Web application framework for Node.js
- **connect-pg-simple**: PostgreSQL session store for Express
- **nanoid**: URL-safe unique string ID generator

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Static type checking
- **PostCSS**: CSS processing with Autoprefixer
- **ESBuild**: Fast JavaScript bundler for production builds
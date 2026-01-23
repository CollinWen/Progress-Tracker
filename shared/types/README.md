# Shared Types

This directory contains type definitions and contracts shared between frontend and backend.

## Usage

### Frontend (TypeScript)
Import types directly from this directory in your TypeScript code.

### Backend (Python)
Use the TypeScript definitions as a reference when creating Pydantic models.
The Python models should match these TypeScript interfaces.

## Files

- `momentum.types.ts` - Core data model types (Epic, Directive, Log, User, etc.)
- `api.types.ts` - API request/response types

## Synchronization

When updating types:
1. Update the TypeScript definitions in this directory
2. Update corresponding Pydantic models in the backend
3. Ensure both match the same structure

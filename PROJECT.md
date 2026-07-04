---
name: datayacht
type: web-saas
created_at: 2026-07-03T21:52:07.280Z
schema_version: 1
---

# datayacht

## Description
A queryable knowledge graph and Vue 3 web interface for exploring curated yacht, builder, marina, and owner data.

## Target users
The founder first, then yacht enthusiasts, brokers, and researchers who want a fast, searchable reference for boat and yacht data.

## Primary use cases
- reporting
- data-entry
- automation

## Success criteria
Can search across all boats, builders, marinas, and owners by any attribute and view results in clean, cross-linked tables and graphics — a personal 'Wikipedia for yachts' built from the /knowledge corpus.

## Problem
The user has tons of scattered, unstructured yacht data spread across 82 exported research documents in /knowledge, with no way to query it, explore relationships between vessels, builders, owners and places, or view it in clean, readable form.

## Goals
- Turn the scattered /knowledge corpus into a structured, queryable knowledge graph of yachts, builders, marinas, yacht clubs, owners, engines and related entities
- Provide a Vue 3 web interface to query the graph and read results in easy-to-read tables and graphics
- Behave like a personal 'Wikipedia for yachts' with fast lookup and cross-linked entity pages
- Ship read-only first, with data ingested via scripts, and deploy to Firebase

## Scope (in)
- Ingestion pipeline that extracts entities and relationships from the /knowledge markdown corpus into a SQLite + generated JSON graph
- Vue 3 SPA to browse, search and filter entities
- Data presented as easy-to-read tables and simple graphics
- Cross-linked entity pages (yacht -> builder -> owner -> marina / region)
- Firebase as the eventual deployment target, with local dev first

## Scope (out)
- User accounts and authentication
- Monetization, payments, paywalls, and affiliate links

## Stack
- frontend_framework: vue3-vite
- backend_framework: node-ingestion-scripts (no live backend in v1; static data served with the SPA)
- database: SQLite (nodes + edges tables) plus a generated JSON graph for the client
- web_deployment_target: firebase (local dev first)

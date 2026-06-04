-- V23: Add scanned field to reimbursements to support Devis-like workflow
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS scanned BOOLEAN NOT NULL DEFAULT FALSE;
